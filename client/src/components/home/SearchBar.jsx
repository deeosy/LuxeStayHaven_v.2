import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useSearchStore from "../../stores/useSearchStore.js";

function normalizeLiteApiDomain(value) {
  let s = String(value || "").trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^https\/\//i, "");
  s = s.replace(/^\/+/, "");
  s = s.split("/")[0] || "";
  return s.trim();
}

function formatMonth(date) {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODateToLocal(dateStr) {
  const raw = String(dateStr || "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(year, month, day);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatRangeLabel(ci, co) {
  if (!ci || !co) return "";
  const opts = { month: "short", day: "numeric" };
  return `${ci.toLocaleDateString("en-US", opts)} - ${co.toLocaleDateString("en-US", opts)}`;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function lightFilterPredictions(predictions, query) {
  const q = normalizeText(query);
  const list = Array.isArray(predictions) ? predictions : [];
  if (!q) return [];
  if (q.length === 3) {
    return list.filter((p) => {
      const name = normalizeText(p?.description || "");
      const words = name.split(/[\s,.-]+/).filter(Boolean);
      return name.startsWith(q) || words.some((w) => w.startsWith(q));
    });
  }
  return list;
}

function extractCountryInfo(place) {
  const ac = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
  const c = ac.find((x) => Array.isArray(x?.types) && x.types.includes("country"));
  return {
    name: c?.fullText || c?.text || "",
    code: c?.shortText || ""
  };
}

function extractCityText(place) {
  const primary = place?.displayName?.text || "";
  if (primary) return primary;
  const ac = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
  const city = ac.find((x) => Array.isArray(x?.types) && x.types.includes("locality"));
  return city?.fullText || city?.text || place?.formattedAddress || place?.name || "";
}

function formatSuggestionPrimary(place) {
  return place?.displayName?.text || place?.formattedAddress || place?.name || "";
}

function formatSuggestionSecondary(place) {
  const c = extractCountryInfo(place);
  return c.name || c.code || "";
}

function lightFilterPlaces(places, query) {
  const q = normalizeText(query);
  const list = Array.isArray(places) ? places : [];
  if (!q) return [];
  if (q.length === 3) {
    return list.filter((p) => {
      const name = normalizeText(formatSuggestionPrimary(p));
      const words = name.split(/[\s,.-]+/).filter(Boolean);
      return name.startsWith(q) || words.some((w) => w.startsWith(q));
    });
  }
  return list;
}

function SearchBar({
  compact = false,
  onSearch,
  initialDestination = "",
  initialCheckin,
  initialCheckout,
  initialRooms = [{ adults: 2, children: 0 }]
}) {
  const navigate = useNavigate();
  const { setDestination, setDates, setAdults, setOccupancies, environment } = useSearchStore();

  const today = useMemo(() => startOfDay(new Date()), []);

  const tomorrow = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t;
  }, []);
  const dayAfter = useMemo(() => addDays(tomorrow, 1), [tomorrow]);

  const [destination, setLocalDestination] = useState(initialDestination);
  const [placeId, setPlaceId] = useState(null);
  const [countryCode, setCountryCode] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [geoError, setGeoError] = useState("");

  const [openPanel, setOpenPanel] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [barRect, setBarRect] = useState(null);
  const [monthLeft, setMonthLeft] = useState(startOfMonth(new Date()));
  const [checkinDate, setCheckinDate] = useState(
    parseISODateToLocal(initialCheckin) || tomorrow
  );
  const [checkoutDate, setCheckoutDate] = useState(
    parseISODateToLocal(initialCheckout) || dayAfter
  );
  const [pendingCheckin, setPendingCheckin] = useState(null);

  const [rooms, setRooms] = useState(initialRooms);

  const barRef = useRef(null);
  const overlayRef = useRef(null);

  function closePanel() {
    if (openPanel === "dates" && pendingCheckin && !checkoutDate) {
      setCheckoutDate(addDays(pendingCheckin, 1));
    }
    setOpenPanel(null);
    setPendingCheckin(null);
  }

  function setPanel(next) {
    if (openPanel === "dates" && next !== "dates" && pendingCheckin && !checkoutDate) {
      setCheckoutDate(addDays(pendingCheckin, 1));
      setPendingCheckin(null);
    }
    setOpenPanel(next);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (
        openPanel &&
        overlayRef.current &&
        !overlayRef.current.contains(e.target) &&
        barRef.current &&
        !barRef.current.contains(e.target)
      ) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openPanel, pendingCheckin, checkoutDate]);

  useEffect(() => {
    if (!openPanel || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openPanel, isMobile]);

  useEffect(() => {
    if (!openPanel || isMobile) return;
    const update = () => {
      if (!barRef.current) return;
      const r = barRef.current.getBoundingClientRect();
      setBarRect(r);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [openPanel, isMobile]);

  useEffect(() => {
    let active = true;
    const q = String(query || "").trim();
    if (q.length < 3) {
      setSuggestions([]);
      setLoadingPlaces(false);
      return;
    }
    const domain = normalizeLiteApiDomain(import.meta.env.VITE_LITEAPI_DOMAIN);
    if (!domain) {
      setSuggestions([]);
      setLoadingPlaces(false);
      return;
    }
    setLoadingPlaces(true);
    const t = setTimeout(() => {
      fetch(
        `https://${domain}/v1/places/search?query=${encodeURIComponent(
          q
        )}&language=en`
      )
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to fetch places"))))
        .then((data) => {
          if (!active) return;
          const arr = Array.isArray(data?.predictions) ? data.predictions : [];
          const filtered = lightFilterPredictions(arr, q);
          setSuggestions(filtered.slice(0, 8));
        })
        .catch(() => {
          if (!active) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (active) setLoadingPlaces(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  function pickPlace(p) {
    const label = String(p?.description || "").trim();
    setLocalDestination(label);
    setQuery("");
    setPlaceId(p?.place_id || p?.placeId || null);
    const maybeCountry =
      p?.structured_formatting?.secondary_text ||
      p?.terms?.[p?.terms?.length - 1]?.value ||
      "";
    let cc = /^[A-Za-z]{2}$/.test(String(maybeCountry).trim())
      ? String(maybeCountry).trim().toUpperCase()
      : "";
    if (cc === "UK") cc = "GB";
    setCountryCode(cc);
    setGeoError("");
    closePanel();
  }

  function aroundMe() {
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn’t support location. Enter a destination instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = pos.coords;
        setLocalDestination("Around my area");
        setQuery("");
        setPlaceId(`geo:${coords.latitude},${coords.longitude}`);
        setCountryCode("");
        setGeoError("");
        closePanel();
      },
      (err) => {
        const code = err?.code;
        const denied = code === 1;
        setPlaceId(null);
        setCountryCode("");
        setGeoError(
          denied
            ? "Location access was denied. Enter a destination instead."
            : "Couldn’t get your location. Enter a destination instead."
        );
        setPanel("where");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function renderMonthGrid(base) {
    const first = startOfMonth(base);
    const startDay = first.getDay() === 0 ? 7 : first.getDay();
    const days = [];
    for (let i = 1; i < startDay; i++) days.push(null);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= last; d++) {
      days.push(new Date(base.getFullYear(), base.getMonth(), d));
    }
    return days;
  }

  function dayState(d) {
    if (!d) return "";
    const ci = checkinDate;
    const co = checkoutDate;
    const same = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (ci && same(d, ci)) return "start";
    if (co && same(d, co)) return "end";
    if (ci && co && d > ci && d < co) return "between";
    return "";
  }

  function selectDate(d) {
    if (!d) return;
    if (startOfDay(d) < today) return;
    if (!pendingCheckin) {
      setPendingCheckin(d);
      setCheckinDate(d);
      setCheckoutDate(null);
      return;
    }
    if (d <= pendingCheckin) {
      const next = addDays(pendingCheckin, 1);
      setCheckinDate(pendingCheckin);
      setCheckoutDate(next);
      setPendingCheckin(null);
      setOpenPanel(null);
      return;
    }
    setCheckinDate(pendingCheckin);
    setCheckoutDate(d);
    setPendingCheckin(null);
    setOpenPanel(null);
  }

  function roomsSummary(rs) {
    const r = rs.length;
    const g = rs.reduce((acc, cur) => acc + (cur.adults || 0) + (cur.children || 0), 0);
    return `${r} Room${r > 1 ? "s" : ""}, ${g} Guest${g > 1 ? "s" : ""}`;
  }

  function submitSearch() {
    const effectiveCheckout = checkoutDate || addDays(checkinDate, 1);
    if (!checkoutDate) setCheckoutDate(effectiveCheckout);
    const payload = {
      destination,
      placeId,
      countryCode,
      checkin: formatISO(checkinDate),
      checkout: formatISO(effectiveCheckout),
      rooms
    };
    setDestination({ placeId, destinationName: destination, countryCode });
    setDates({ checkin: payload.checkin, checkout: payload.checkout });
    setOccupancies(rooms);
    setAdults(rooms.reduce((a, r) => a + (r.adults || 0), 0));
    const url = new URLSearchParams();
    url.set("checkin", payload.checkin);
    url.set("checkout", payload.checkout);
    const totalAdults = rooms.reduce((a, r) => a + (r.adults || 0), 0) || 2;
    url.set("adults", String(totalAdults));
    if (placeId && String(placeId).startsWith("geo:")) {
      const parts = String(placeId).slice(4).split(",");
      url.set("latitude", parts[0]);
      url.set("longitude", parts[1]);
    } else {
      const parts = String(destination || "").split(",").map((s) => s.trim());
      const city = parts[0] || "";
      const cc = countryCode || parts[1] || "";
      if (city) url.set("city", city);
      if (cc) url.set("countryCode", cc);
      if (placeId) url.set("placeId", String(placeId));
    }
    const childrenCount = rooms.reduce((acc, r) => acc + (r.children || 0), 0);
    if (rooms.length > 1 || childrenCount > 0) {
      url.set(
        "occupancies",
        JSON.stringify(
          rooms.map((r) => ({
            adults: r.adults || 2,
            children: r.children || 0
          }))
        )
      );
      url.set("rooms", String(rooms.length));
      url.set("children", String(childrenCount));
    }
    if (onSearch) {
      onSearch(Object.fromEntries(url.entries()));
    } else {
      navigate(`/search?${url.toString()}`);
    }
  }

  return (
    <div className={compact ? "w-full" : "w-full max-w-4xl mx-auto"}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/70 backdrop-blur shadow-soft p-2 sm:p-2.5"
      >
        <div ref={barRef} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-stretch gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">
              <div className="text-[11px] text-textLight ">Where</div>
              <input
                type="text"
                placeholder="Enter a destination"
                value={destination}
                onChange={(e) => {
                  const next = e.target.value;
                  setLocalDestination(next);
                  setQuery(next);
                  setGeoError("");
                  setPanel("where");
                }}
                onFocus={() => {
                  setQuery("");
                  setPanel("where");
                }}
                className="w-full bg-white text-sm text-textDark placeholder:text-textLight outline-none"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => (openPanel === "dates" ? closePanel() : setPanel("dates"))}
                className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              >
                <div className="text-[11px] text-textLight">Dates</div>
                <div className="text-textDark">
                  {formatRangeLabel(checkinDate, checkoutDate)}
                </div>
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => (openPanel === "guests" ? closePanel() : setPanel("guests"))}
                className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              >
                <div className="text-[11px] text-textLight">Guests</div>
                <div className="text-textDark">{roomsSummary(rooms)}</div>
              </button>
            </div>
          </div>
          <div className="flex items-stretch">
            <button
              type="button"
              onClick={submitSearch}
              className="group w-full inline-flex items-center justify-center rounded-xl bg-accent text-white px-4 md:px-5"
              aria-label="Search"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="overflow-hidden ml-0 w-0 group-hover:ml-2 group-hover:w-[70px] transition-all text-sm">
                Search
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {openPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] pointer-events-none"
          >
            {isMobile ? (
              <div
                ref={overlayRef}
                className="pointer-events-auto fixed inset-0 bg-background"
              >
                <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100">
                  <div className="text-sm font-semibold text-primary">
                    {openPanel === "where"
                      ? "Where"
                      : openPanel === "dates"
                      ? "Dates"
                      : "Guests"}
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {openPanel === "where" && (
                  <div className="p-4 space-y-3">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Enter a destination"
                      value={destination}
                      onChange={(e) => {
                        const next = e.target.value;
                        setLocalDestination(next);
                        setQuery(next);
                        setGeoError("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-textDark placeholder:text-textLight outline-none"
                    />

                    <div className="rounded-2xl bg-white shadow-soft border border-slate-100 px-2">
                      {query.trim().length === 0 && (
                        <button
                          type="button"
                          onClick={aroundMe}
                          className="flex items-center gap-3 w-full rounded-xl px-3 py-3 hover:bg-slate-50 text-sm"
                        >
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </span>
                          Around my area
                        </button>
                      )}
                      {geoError && (
                        <div className="px-3 pb-2 text-[11px] text-textLight">
                          {geoError}
                        </div>
                      )}
                      <div className="max-h-[60vh] overflow-y-auto">
                        {query.trim().length > 0 && query.trim().length < 3 ? (
                          <div className="p-3 text-xs text-textMedium">
                            Type at least 3 characters
                          </div>
                        ) : query.trim().length >= 3 && loadingPlaces ? (
                          <div className="p-3 text-xs text-textMedium">Searching…</div>
                        ) : query.trim().length >= 3 && suggestions.length === 0 ? (
                          <div className="p-3 text-xs text-textMedium">No suggestions</div>
                        ) : (
                          query.trim().length >= 3 &&
                          suggestions.map((s, i) => (
                            <button
                              key={s.place_id || s.placeId || `${i}-${s.description || "place"}`}
                              type="button"
                              onClick={() => pickPlace(s)}
                              className="w-full text-left px-3 py-3 hover:bg-slate-50"
                            >
                              <div className="text-sm text-textDark">
                                {s?.structured_formatting?.main_text ||
                                  s?.description ||
                                  ""}
                              </div>
                              <div className="text-[11px] text-textLight">
                                {s?.structured_formatting?.secondary_text || ""}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {openPanel === "dates" && (
                  <div className="p-4">
                    <div className="rounded-2xl bg-white shadow-soft border border-slate-100 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[0, 1].map((i) => {
                          const base = new Date(monthLeft.getFullYear(), monthLeft.getMonth() + i, 1);
                          const days = renderMonthGrid(base);
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between px-1 pb-2 text-sm font-medium">
                                <div>{formatMonth(base)}</div>
                              </div>
                              <div className="grid grid-cols-7 gap-1 text-center text-xs text-textLight mb-1">
                                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                                  <div key={d}>{d}</div>
                                ))}
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {days.map((d, idx) => {
                                  const isPast = d ? startOfDay(d) < today : false;
                                  const isToday =
                                    d &&
                                    d.getFullYear() === today.getFullYear() &&
                                    d.getMonth() === today.getMonth() &&
                                    d.getDate() === today.getDate();
                                  const st = dayState(d);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={!d || isPast}
                                      onClick={() => selectDate(d)}
                                      className={[
                                        "h-10 rounded-lg text-sm",
                                        !d
                                          ? "opacity-0"
                                          : isPast
                                          ? "text-slate-300 cursor-not-allowed"
                                          : "hover:bg-slate-100",
                                        st === "start" || st === "end"
                                          ? "bg-accent text-white"
                                          : st === "between"
                                          ? "bg-accent/10"
                                          : isToday
                                          ? "bg-white ring-1 ring-accent/60 font-medium"
                                          : "bg-white"
                                      ].join(" ")}
                                    >
                                      {d ? d.getDate() : ""}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setMonthLeft(
                              new Date(monthLeft.getFullYear(), monthLeft.getMonth() - 1, 1)
                            )
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMonthLeft(
                              new Date(monthLeft.getFullYear(), monthLeft.getMonth() + 1, 1)
                            )
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {openPanel === "guests" && (
                  <div className="p-4">
                    <div className="rounded-2xl bg-white shadow-soft border border-slate-100 p-4">
                      <div className="text-sm font-semibold mb-2">Configuring Rooms</div>
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        {rooms.map((r, idx) => (
                          <div key={idx} className="space-y-2 border-t first:border-t-0 pt-2 first:pt-0">
                            <div className="text-sm font-medium">Room {idx + 1}</div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm">Adults</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRooms((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, adults: Math.max(1, (x.adults || 1) - 1) } : x
                                      )
                                    )
                                  }
                                  className="h-8 w-8 rounded-full border border-slate-200"
                                >
                                  −
                                </button>
                                <div className="w-6 text-center text-sm">{r.adults || 1}</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRooms((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, adults: Math.min(6, (x.adults || 1) + 1) } : x
                                      )
                                    )
                                  }
                                  className="h-8 w-8 rounded-full border border-slate-200"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm">Children</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRooms((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, children: Math.max(0, (x.children || 0) - 1) } : x
                                      )
                                    )
                                  }
                                  className="h-8 w-8 rounded-full border border-slate-200"
                                >
                                  −
                                </button>
                                <div className="w-6 text-center text-sm">{r.children || 0}</div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRooms((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, children: Math.min(4, (x.children || 0) + 1) } : x
                                      )
                                    )
                                  }
                                  className="h-8 w-8 rounded-full border border-slate-200"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            {rooms.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setRooms((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-xs text-error"
                              >
                                Remove room
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setRooms((prev) =>
                              prev.length >= 6 ? prev : [...prev, { adults: 1, children: 0 }]
                            )
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                        >
                          Add room
                        </button>
                        <button
                          type="button"
                          onClick={closePanel}
                          className="rounded-full bg-accent text-white px-4 py-1.5 text-sm"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div ref={overlayRef} className="pointer-events-none">
                {openPanel === "where" && barRect && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="pointer-events-auto fixed rounded-2xl bg-white shadow-soft border border-slate-100 px-2 w-[20rem] max-w-[80vw]"
                    style={{ top: barRect.bottom + 10, left: barRect.left }}
                  >
                    {query.trim().length === 0 && (
                      <button
                        type="button"
                        onClick={aroundMe}
                        className="flex items-center gap-3 w-full rounded-xl px-3 py-2 hover:bg-slate-50 text-sm"
                      >
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </span>
                        Around my area
                      </button>
                    )}
                    {geoError && (
                      <div className="px-3 pb-2 text-[11px] text-textLight">
                        {geoError}
                      </div>
                    )}
                    <div className="max-h-72 overflow-y-auto">
                      {query.trim().length > 0 && query.trim().length < 3 ? (
                        <div className="p-3 text-xs text-textMedium">
                          Type at least 3 characters
                        </div>
                      ) : query.trim().length >= 3 && loadingPlaces ? (
                        <div className="p-3 text-xs text-textMedium">Searching…</div>
                      ) : query.trim().length >= 3 && suggestions.length === 0 ? (
                        <div className="p-3 text-xs text-textMedium">No suggestions</div>
                      ) : (
                        query.trim().length >= 3 &&
                        suggestions.map((s, i) => (
                          <button
                            key={s.place_id || s.placeId || `${i}-${s.description || "place"}`}
                            type="button"
                            onClick={() => pickPlace(s)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                          >
                            <div className="text-sm text-textDark">
                              {s?.structured_formatting?.main_text ||
                                s?.description ||
                                ""}
                            </div>
                            <div className="text-[11px] text-textLight">
                              {s?.structured_formatting?.secondary_text || ""}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {openPanel === "dates" && barRect && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="pointer-events-auto fixed -translate-x-1/2 rounded-2xl bg-white shadow-soft border border-slate-100 p-4 w-[44rem]  max-w-[92vw]"
                    style={{ top: barRect.bottom + 10, left: barRect.left + barRect.width / 2 }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {[0, 1].map((i) => {
                        const base = new Date(monthLeft.getFullYear(), monthLeft.getMonth() + i, 1);
                        const days = renderMonthGrid(base);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between px-1 pb-2 text-sm font-medium">
                              <div>{formatMonth(base)}</div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-textLight mb-1">
                              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                                <div key={d}>{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {days.map((d, idx) => {
                                const isPast = d ? startOfDay(d) < today : false;
                                const isToday =
                                  d &&
                                  d.getFullYear() === today.getFullYear() &&
                                  d.getMonth() === today.getMonth() &&
                                  d.getDate() === today.getDate();
                                const st = dayState(d);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={!d || isPast}
                                    onClick={() => selectDate(d)}
                                    className={[
                                      "h-9 rounded-lg text-sm",
                                      !d
                                        ? "opacity-0"
                                        : isPast
                                        ? "text-slate-300 cursor-not-allowed"
                                        : "hover:bg-slate-100",
                                      st === "start" || st === "end"
                                        ? "bg-accent text-white"
                                        : st === "between"
                                        ? "bg-accent/10"
                                        : isToday
                                        ? "bg-white ring-1 ring-accent/60 font-medium"
                                        : "bg-white"
                                    ].join(" ")}
                                  >
                                    {d ? d.getDate() : ""}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setMonthLeft(
                            new Date(monthLeft.getFullYear(), monthLeft.getMonth() - 1, 1)
                          )
                        }
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMonthLeft(
                            new Date(monthLeft.getFullYear(), monthLeft.getMonth() + 1, 1)
                          )
                        }
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                      >
                        ›
                      </button>
                    </div>
                  </motion.div>
                )}

                {openPanel === "guests" && barRect && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="pointer-events-auto fixed rounded-2xl bg-white shadow-soft border border-slate-100 p-4 w-[24rem] max-w-[92vw]"
                    style={{ top: barRect.bottom + 10, right: Math.max(12, window.innerWidth - barRect.right) }}
                  >
                    <div className="text-sm font-semibold mb-2">Configuring Rooms</div>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {rooms.map((r, idx) => (
                        <div key={idx} className="space-y-2 border-t first:border-t-0 pt-2 first:pt-0">
                          <div className="text-sm font-medium">Room {idx + 1}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm">Adults</div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setRooms((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, adults: Math.max(1, (x.adults || 1) - 1) } : x
                                    )
                                  )
                                }
                                className="h-8 w-8 rounded-full border border-slate-200"
                              >
                                −
                              </button>
                              <div className="w-6 text-center text-sm">{r.adults || 1}</div>
                              <button
                                type="button"
                                onClick={() =>
                                  setRooms((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, adults: Math.min(6, (x.adults || 1) + 1) } : x
                                    )
                                  )
                                }
                                className="h-8 w-8 rounded-full border border-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm">Children</div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setRooms((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, children: Math.max(0, (x.children || 0) - 1) } : x
                                    )
                                  )
                                }
                                className="h-8 w-8 rounded-full border border-slate-200"
                              >
                                −
                              </button>
                              <div className="w-6 text-center text-sm">{r.children || 0}</div>
                              <button
                                type="button"
                                onClick={() =>
                                  setRooms((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, children: Math.min(4, (x.children || 0) + 1) } : x
                                    )
                                  )
                                }
                                className="h-8 w-8 rounded-full border border-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {rooms.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setRooms((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-xs text-error"
                            >
                              Remove room
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setRooms((prev) =>
                            prev.length >= 6 ? prev : [...prev, { adults: 1, children: 0 }]
                          )
                        }
                        className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                      >
                        Add room
                      </button>
                      <button
                        type="button"
                        onClick={closePanel}
                        className="rounded-full bg-accent text-white px-4 py-1.5 text-sm"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(SearchBar);
