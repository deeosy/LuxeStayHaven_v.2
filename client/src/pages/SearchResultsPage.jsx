import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import useSearchStore from "../stores/useSearchStore.js";
import { searchHotels } from "../utils/api.js";
import SearchBar from "../components/home/SearchBar.jsx";
import HotelCard from "../components/search/HotelCard.jsx";
import HotelCardSkeleton from "../components/search/HotelCardSkeleton.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { formatDate } from "../utils/formatters.js";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function decodeOccupancies(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {}
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {}
  try {
    return JSON.parse(atob(value));
  } catch {}
  return null;
}

function buildInitialRooms({ occupanciesRaw, roomsCount, totalAdults, totalChildren }) {
  const parsed = decodeOccupancies(occupanciesRaw);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((o) => ({
      adults: Number(o?.adults) > 0 ? Number(o.adults) : 2,
      children: Array.isArray(o?.children)
        ? o.children.length
        : Number(o?.children) >= 0
        ? Number(o.children)
        : Array.isArray(o?.childrenAges)
        ? o.childrenAges.length
        : 0
    }));
  }

  const rooms = Number.isFinite(roomsCount) && roomsCount > 0 ? roomsCount : 1;
  const adults = Number.isFinite(totalAdults) && totalAdults > 0 ? totalAdults : 2;
  const children = Number.isFinite(totalChildren) && totalChildren >= 0 ? totalChildren : 0;

  const arr = Array.from({ length: rooms }, () => ({ adults: 1, children: 0 }));
  let remainingAdults = adults - rooms;
  let idx = 0;
  while (remainingAdults > 0) {
    arr[idx].adults += 1;
    remainingAdults -= 1;
    idx = (idx + 1) % rooms;
  }
  arr[0].children = children;
  return arr;
}

function SearchResultsPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const {
    destinationName,
    checkin: storeCheckin,
    checkout: storeCheckout,
    adults: storeAdults,
    searchResults,
    setSearchResults,
    loading,
    setLoading,
    error,
    setError,
    setDestination,
    setDates,
    setAdults,
    environment
  } = useSearchStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const location = useLocation();
  const [roomsSummary, setRoomsSummary] = useState({ rooms: null, children: null });

  useEffect(() => {
    const raw = query.get("occupancies") || "";
    if (!raw) {
      const rooms = Number(query.get("rooms") || 1);
      const children = Number(query.get("children") || 0);
      setRoomsSummary({
        rooms: Number.isFinite(rooms) && rooms > 0 ? rooms : 1,
        children: Number.isFinite(children) && children >= 0 ? children : 0
      });
      return;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}
    if (!parsed) {
      try {
        parsed = JSON.parse(decodeURIComponent(raw));
      } catch {}
    }
    if (!parsed) {
      try {
        parsed = JSON.parse(atob(raw));
      } catch {}
    }
    if (!Array.isArray(parsed)) {
      const rooms = Number(query.get("rooms") || 1);
      const children = Number(query.get("children") || 0);
      setRoomsSummary({
        rooms: Number.isFinite(rooms) && rooms > 0 ? rooms : 1,
        children: Number.isFinite(children) && children >= 0 ? children : 0
      });
      return;
    }
    const rooms = parsed.length || 1;
    const children = parsed.reduce((acc, o) => {
      const rawChildren = o?.children;
      if (Array.isArray(rawChildren)) return acc + rawChildren.length;
      const rawAges = o?.childrenAges;
      if (Array.isArray(rawAges)) return acc + rawAges.length;
      if (typeof rawChildren === "number" && Number.isFinite(rawChildren)) {
        return acc + rawChildren;
      }
      if (typeof rawChildren === "string") {
        const n = Number(rawChildren);
        if (Number.isFinite(n)) return acc + n;
      }
      return acc;
    }, 0);
    setRoomsSummary({ rooms, children });
  }, [query]);

  useEffect(() => {
    const city = query.get("city");
    const countryCode = query.get("countryCode") || "";
    const placeId = query.get("placeId") || "";
    const latitude = query.get("latitude") || "";
    const longitude = query.get("longitude") || "";
    const radius = query.get("radius") || "";
    const occupancies = query.get("occupancies") || "";
    const checkin = query.get("checkin") || "";
    const checkout = query.get("checkout") || "";
    const adults = Number(query.get("adults") || 2);

    if (!checkin || !checkout) return;
    if (!city && !placeId && !(latitude && longitude)) return;

    const destinationLabel = city
      ? `${city}${countryCode ? `, ${countryCode}` : ""}`
      : destinationName || "Around my area";

    setDestination({
      placeId: placeId || null,
      destinationName: destinationLabel,
      countryCode: countryCode.toUpperCase()
    });
    setDates({ checkin, checkout });
    setAdults(adults);

    let cancelled = false;
    setLoading(true);
    setError(null);
    searchHotels({
      checkin,
      checkout,
      adults,
      city: city || "",
      countryCode: countryCode.toUpperCase(),
      placeId: placeId || "",
      latitude: latitude || "",
      longitude: longitude || "",
      radius: radius || "",
      occupancies: occupancies || "",
      environment
    })
      .then((data) => {
        if (cancelled) return;
        setSearchResults(data.rates || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load hotels");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    query,
    environment,
    setSearchResults,
    setLoading,
    setError,
    setDestination,
    setDates,
    setAdults
  ]);

  const title = useMemo(() => {
    const city = query.get("city");
    const checkin = query.get("checkin");
    const checkout = query.get("checkout");
    if (!city) return "Search Hotels | LuxeStayHaven";
    if (checkin && checkout) {
      return `Hotels in ${city} (${checkin}–${checkout}) | LuxeStayHaven`;
    }
    return `Hotels in ${city} | LuxeStayHaven`;
  }, [query]);

  return (
    <section className="bg-background min-h-[60vh] py-8 sm:py-10">
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content="Browse luxury hotels with transparent rates, refundable options, and premium stays curated by LuxeStayHaven."
        />
        <meta property="og:title" content={title} />
        <meta
          property="og:description"
          content="Browse luxury hotels with premium amenities and seamless booking."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-3">
          <SearchBar
            key={location.search}
            compact
            initialDestination={
              query.get("city")
                ? `${query.get("city")}${query.get("countryCode") ? `, ${query.get("countryCode")}` : ""}`
                : destinationName
            }
            initialCheckin={query.get("checkin") || storeCheckin}
            initialCheckout={query.get("checkout") || storeCheckout}
            initialRooms={buildInitialRooms({
              occupanciesRaw: query.get("occupancies") || "",
              roomsCount: Number(query.get("rooms") || 1),
              totalAdults: Number(query.get("adults") || storeAdults || 2),
              totalChildren: Number(query.get("children") || 0)
            })}
          />
        </div>



        <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
          <aside className="flex flex-col lg:sticky lg:top-20">
            <div className="px-2">
              <p className="text-xs uppercase tracking-[0.2em] text-textLight">
                Search results
              </p>
              <h2 className="font-heading text-2xl text-primary">
                {destinationName || "Browse luxury stays"}
              </h2>
              <p className="text-xs text-textMedium mb-6">
                {storeCheckin && storeCheckout
                  ? `${formatDate(storeCheckin)} – ${formatDate(
                      storeCheckout
                    )} · ${
                      roomsSummary.rooms ?? 1
                    } room${(roomsSummary.rooms ?? 1) > 1 ? "s" : ""} · ${
                      storeAdults
                    } adult${storeAdults > 1 ? "s" : ""}${
                      (roomsSummary.children ?? 0) > 0
                        ? ` · ${roomsSummary.children} child${
                            roomsSummary.children > 1 ? "ren" : ""
                          }`
                        : ""
                    }`
                  : "Select dates to see the best available rates."}
              </p>
            </div>
            <div
              className={`rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-6 text-sm ${
                filtersOpen ? "" : "hidden lg:block"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg text-primary">Filters</h3>
                <div className="lg:hidden">
                  <Button type="button" variant="ghost" onClick={() => setFiltersOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                  Price range
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input id="minPrice" type="number" label="Min" placeholder="0" />
                  <Input id="maxPrice" type="number" label="Max" placeholder="2000" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-textLight">
                  <span>UI only</span>
                  <span>Per night</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                  Stars
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-textMedium hover:border-slate-300 transition">3+</button>
                  <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-textMedium hover:border-slate-300 transition">4+</button>
                  <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-textMedium hover:border-slate-300 transition">5</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                  Refundable
                </div>
                <label className="flex items-center gap-2 text-xs text-textMedium">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                  Show refundable only
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Button type="button" className="flex-1" disabled>
                  Apply
                </Button>
                <Button type="button" variant="secondary" className="flex-1" disabled>
                  Clear
                </Button>
              </div>
            </div>
          </aside>

          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-textMedium">
                {loading ? "Searching…" : `${searchResults.length} hotel${searchResults.length === 1 ? "" : "s"} found`}
              </div>
              <div className="flex items-center gap-2 text-xs text-textMedium">
                <span className="text-textLight">Sort</span>
                <select className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
                  <option>Recommended</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Stars</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <HotelCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl bg-white shadow-soft border border-error/20 p-4 text-sm text-error">
                {error}
              </div>
            )}

            {!loading && !error && searchResults.length === 0 && (
              <div className="rounded-2xl bg-white shadow-soft border border-slate-100 p-8 text-center space-y-3">
                <div className="text-3xl">🌍</div>
                <div className="font-heading text-lg text-primary">
                  No hotels found
                </div>
                <p className="text-sm text-textMedium max-w-md mx-auto">
                  Try adjusting your dates, choosing a nearby destination, or searching with fewer filters.
                </p>
              </div>
            )}

            {!loading && !error && searchResults.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((rate) => (
                  <HotelCard
                    key={rate.hotelId}
                    rate={rate}
                    searchParams={{
                      checkin: query.get("checkin") || storeCheckin,
                      checkout: query.get("checkout") || storeCheckout,
                      adults: Number(query.get("adults") || storeAdults || 2),
                      environment
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SearchResultsPage;
