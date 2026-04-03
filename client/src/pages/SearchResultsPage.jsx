import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minStars, setMinStars] = useState(0);
  const [refundableOnly, setRefundableOnly] = useState(false);

  const priceBounds = useMemo(() => {
    let min = null;
    let max = null;
    for (const r of searchResults || []) {
      const roomTypes = Array.isArray(r?.roomTypes) ? r.roomTypes : [];
      for (const rt of roomTypes) {
        const offers = Array.isArray(rt?.rates) ? rt.rates : [];
        for (const o of offers) {
          const raw =
            o?.retailRate?.total?.[0]?.amount ??
            o?.retailRate?.amount ??
            o?.retailRate?.totalAmount ??
            null;
          const n = typeof raw === "number" ? raw : Number(raw);
          if (!Number.isFinite(n)) continue;
          min = min === null ? n : Math.min(min, n);
          max = max === null ? n : Math.max(max, n);
        }
      }
    }
    if (min === null || max === null) return null;
    return { min, max };
  }, [searchResults]);

  useEffect(() => {
    if (!priceBounds) {
      setPriceMin("");
      setPriceMax("");
      return;
    }
    setPriceMin(String(Math.floor(priceBounds.min)));
    setPriceMax(String(Math.ceil(priceBounds.max)));
  }, [priceBounds?.min, priceBounds?.max]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (refundableOnly) count += 1;
    if (minStars > 0) count += 1;
    if (priceBounds) {
      const minN = priceMin === "" ? priceBounds.min : Number(priceMin);
      const maxN = priceMax === "" ? priceBounds.max : Number(priceMax);
      const minChanged = Number.isFinite(minN) && minN > priceBounds.min;
      const maxChanged = Number.isFinite(maxN) && maxN < priceBounds.max;
      if (minChanged || maxChanged) count += 1;
    }
    return count;
  }, [refundableOnly, minStars, priceMin, priceMax, priceBounds]);

  const filteredResults = useMemo(() => {
    // Filter logic (client-side):
    // 1) If "Refundable only" is enabled, we first remove non-refundable offers at the rate level.
    // 2) We then compute the lowest nightly retailRate from the remaining offers and apply the price range.
    // 3) Finally, we apply the minimum star rating filter on the hotel.
    const bounds = priceBounds;
    const minN = priceMin === "" ? bounds?.min : Number(priceMin);
    const maxN = priceMax === "" ? bounds?.max : Number(priceMax);
    const hasPrice =
      bounds && Number.isFinite(minN) && Number.isFinite(maxN) && (minN > bounds.min || maxN < bounds.max);

    function cheapestNightlyAmount(rate) {
      let lowest = null;
      const roomTypes = Array.isArray(rate?.roomTypes) ? rate.roomTypes : [];
      for (const rt of roomTypes) {
        const offers = Array.isArray(rt?.rates) ? rt.rates : [];
        for (const o of offers) {
          const raw =
            o?.retailRate?.total?.[0]?.amount ??
            o?.retailRate?.amount ??
            o?.retailRate?.totalAmount ??
            null;
          const n = typeof raw === "number" ? raw : Number(raw);
          if (!Number.isFinite(n)) continue;
          lowest = lowest === null ? n : Math.min(lowest, n);
        }
      }
      return lowest;
    }

    function refundableOnlyRate(rate) {
      if (!refundableOnly) return rate;
      const roomTypes = Array.isArray(rate?.roomTypes) ? rate.roomTypes : [];
      const nextRoomTypes = roomTypes
        .map((rt) => {
          const offers = Array.isArray(rt?.rates) ? rt.rates : [];
          const filteredOffers = offers.filter(
            (o) => o?.cancellationPolicies?.refundableTag === "RFN"
          );
          if (filteredOffers.length === 0) return null;
          return { ...rt, rates: filteredOffers };
        })
        .filter(Boolean);
      if (nextRoomTypes.length === 0) return null;
      return { ...rate, roomTypes: nextRoomTypes };
    }

    return (searchResults || [])
      .map((rate) => refundableOnlyRate(rate))
      .filter(Boolean)
      .filter((rate) => {
        if (minStars <= 0) return true;
        const stars = Number(
          rate?.hotel?.stars ?? rate?.hotel?.starRating ?? rate?.hotel?.rating ?? 0
        );
        return Number.isFinite(stars) && stars >= minStars;
      })
      .filter((rate) => {
        if (!hasPrice) return true;
        const amount = cheapestNightlyAmount(rate);
        if (!Number.isFinite(amount)) return false;
        return amount >= minN && amount <= maxN;
      });
  }, [searchResults, refundableOnly, minStars, priceMin, priceMax, priceBounds]);

  function clearAllFilters() {
    setRefundableOnly(false);
    setMinStars(0);
    if (priceBounds) {
      setPriceMin(String(Math.floor(priceBounds.min)));
      setPriceMax(String(Math.ceil(priceBounds.max)));
    } else {
      setPriceMin("");
      setPriceMax("");
    }
  }

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
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg text-primary">Filters</h3>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent/10 px-2 text-xs font-medium text-accent">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
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
                  <Input
                    id="minPrice"
                    type="number"
                    label="Min"
                    placeholder={priceBounds ? String(Math.floor(priceBounds.min)) : "0"}
                    value={priceMin}
                    min={0}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                  <Input
                    id="maxPrice"
                    type="number"
                    label="Max"
                    placeholder={priceBounds ? String(Math.ceil(priceBounds.max)) : "2000"}
                    value={priceMax}
                    min={0}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-textLight">
                  <span>{priceBounds ? "Best available rate" : "—"}</span>
                  <span>Per night</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                  Stars
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 4, 5].map((n) => {
                    const active = minStars === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMinStars((cur) => (cur === n ? 0 : n))}
                        className={[
                          "rounded-full border px-3 py-2 text-xs transition",
                          active
                            ? "border-accent bg-accent text-white"
                            : "border-slate-200 bg-white text-textMedium hover:border-slate-300"
                        ].join(" ")}
                      >
                        {n === 5 ? "5" : `${n}+`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                  Refundable
                </div>
                <label className="flex items-center gap-2 text-xs text-textMedium">
                  <input
                    type="checkbox"
                    checked={refundableOnly}
                    onChange={(e) => setRefundableOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Show refundable only
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" className="w-full" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            </div>
          </aside>

          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-textMedium">
                <div>
                  {loading
                    ? "Searching…"
                    : activeFilterCount > 0
                    ? `${filteredResults.length} of ${searchResults.length} hotels`
                    : `${searchResults.length} hotel${searchResults.length === 1 ? "" : "s"} found`}
                </div>
                <div className="lg:hidden">
                  <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)}>
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </Button>
                </div>
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

            {!loading && !error && searchResults.length > 0 && filteredResults.length === 0 && (
              <div className="rounded-2xl bg-white shadow-soft border border-slate-100 p-8 text-center space-y-3">
                <div className="font-heading text-lg text-primary">No matches</div>
                <p className="text-sm text-textMedium max-w-md mx-auto">
                  Try widening your price range, lowering the star minimum, or clearing filters.
                </p>
                <div className="flex justify-center">
                  <Button type="button" variant="secondary" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && filteredResults.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredResults.map((rate) => (
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
