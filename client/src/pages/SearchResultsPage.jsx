import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import useSearchStore from "../stores/useSearchStore.js";
import { searchHotels } from "../utils/api.js";
import SearchBar from "../components/home/SearchBar.jsx";
import HotelCard from "../components/search/HotelCard.jsx";
import HotelCardSkeleton from "../components/search/HotelCardSkeleton.jsx";
import Button from "../components/ui/Button.jsx";
import { formatDate } from "../utils/formatters.js";
import { trackOnce } from "../utils/analytics.js";

const BATCH_SIZE = 9;

// Performance: lazy-load the filters UI to keep initial search results render fast.
const FiltersSidebar = React.lazy(() => import("../components/search/FiltersSidebar.jsx"));

function mergeByHotelId(prev, next) {
  const map = new Map();
  for (const r of prev || []) {
    if (r?.hotelId) map.set(r.hotelId, r);
  }
  const out = [...(prev || [])];
  for (const r of next || []) {
    if (!r?.hotelId) continue;
    if (map.has(r.hotelId)) continue;
    map.set(r.hotelId, r);
    out.push(r);
  }
  return out;
}

function getCheapestNightlyAmount(rate) {
  let lowest = null;
  const roomTypes = Array.isArray(rate?.roomTypes) ? rate.roomTypes : [];
  for (const rt of roomTypes) {
    const offers = Array.isArray(rt?.rates) ? rt.rates : [];
    for (const o of offers) {
      const raw =
        o?.retailRate?.total?.[0]?.amount ?? o?.retailRate?.amount ?? o?.retailRate?.totalAmount ?? null;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) continue;
      lowest = lowest === null ? n : Math.min(lowest, n);
    }
  }
  return lowest;
}

function getHotelStars(rate) {
  const raw = rate?.hotel?.stars ?? rate?.hotel?.starRating ?? rate?.hotel?.rating ?? 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function parseBooleanParam(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (s === "") return null;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return null;
}

function parseStarMin(value) {
  if (!value) return 0;
  const parts = String(value)
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 5);
  if (parts.length === 0) return 0;
  return Math.min(...parts);
}

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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchResultsRef = useRef(searchResults);
  const appliedMinStars = useMemo(() => parseStarMin(query.get("starRating")), [query]);
  const appliedRefundableOnly = useMemo(
    () => parseBooleanParam(query.get("refundable")) === true,
    [query]
  );
  const appliedBoardType = useMemo(() => String(query.get("boardType") || "").trim(), [query]);

  const [draftPriceMin, setDraftPriceMin] = useState("");
  const [draftPriceMax, setDraftPriceMax] = useState("");
  const [appliedPriceMin, setAppliedPriceMin] = useState("");
  const [appliedPriceMax, setAppliedPriceMax] = useState("");
  const [draftMinStars, setDraftMinStars] = useState(0);
  const [draftRefundableOnly, setDraftRefundableOnly] = useState(false);
  const [sortKey, setSortKey] = useState("recommended");

  const priceBounds = useMemo(() => {
    let min = null;
    let max = null;
    for (const r of searchResults || []) {
      const n = getCheapestNightlyAmount(r);
      if (!Number.isFinite(n)) continue;
      min = min === null ? n : Math.min(min, n);
      max = max === null ? n : Math.max(max, n);
    }
    if (min === null || max === null) return null;
    return { min, max };
  }, [searchResults]);

  useEffect(() => {
    if (!priceBounds) {
      setDraftPriceMin("");
      setDraftPriceMax("");
      setAppliedPriceMin("");
      setAppliedPriceMax("");
      return;
    }
    const nextMin = String(Math.floor(priceBounds.min));
    const nextMax = String(Math.ceil(priceBounds.max));
    setDraftPriceMin((prev) => (prev === "" ? nextMin : prev));
    setDraftPriceMax((prev) => (prev === "" ? nextMax : prev));
    setAppliedPriceMin((prev) => (prev === "" ? nextMin : prev));
    setAppliedPriceMax((prev) => (prev === "" ? nextMax : prev));
  }, [priceBounds?.min, priceBounds?.max]);

  useEffect(() => {
    setDraftMinStars(appliedMinStars);
    setDraftRefundableOnly(appliedRefundableOnly);
  }, [appliedMinStars, appliedRefundableOnly]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedRefundableOnly) count += 1;
    if (appliedMinStars > 0) count += 1;
    if (appliedBoardType) count += 1;
    if (priceBounds) {
      const minN = appliedPriceMin === "" ? priceBounds.min : Number(appliedPriceMin);
      const maxN = appliedPriceMax === "" ? priceBounds.max : Number(appliedPriceMax);
      const minChanged = Number.isFinite(minN) && minN > priceBounds.min;
      const maxChanged = Number.isFinite(maxN) && maxN < priceBounds.max;
      if (minChanged || maxChanged) count += 1;
    }
    return count;
  }, [
    appliedRefundableOnly,
    appliedMinStars,
    appliedBoardType,
    appliedPriceMin,
    appliedPriceMax,
    priceBounds
  ]);

  const filteredResults = useMemo(() => {
    // Backend vs client-side:
    // - Backend filters: stars (starRating), refundable, boardType.
    // - Client-side filters: price range (fast and UI-only).
    const bounds = priceBounds;
    const minN = appliedPriceMin === "" ? bounds?.min : Number(appliedPriceMin);
    const maxN = appliedPriceMax === "" ? bounds?.max : Number(appliedPriceMax);
    const hasPrice =
      bounds && Number.isFinite(minN) && Number.isFinite(maxN) && (minN > bounds.min || maxN < bounds.max);

    return (searchResults || []).filter((rate) => {
      if (!hasPrice) return true;
      const amount = getCheapestNightlyAmount(rate);
      if (!Number.isFinite(amount)) return false;
      return amount >= minN && amount <= maxN;
    });
  }, [searchResults, appliedPriceMin, appliedPriceMax, priceBounds]);

  const sortedResults = useMemo(() => {
    // Sorting is applied after filtering so the UI stays predictable:
    // - Recommended keeps the API order
    // - Price sorts by the best available nightly retailRate (cheapest offer)
    // - Stars sorts by hotel star rating (descending)
    const list = [...filteredResults];
    if (sortKey === "price_asc") {
      list.sort((a, b) => {
        const ap = getCheapestNightlyAmount(a);
        const bp = getCheapestNightlyAmount(b);
        if (!Number.isFinite(ap) && !Number.isFinite(bp)) return 0;
        if (!Number.isFinite(ap)) return 1;
        if (!Number.isFinite(bp)) return -1;
        return ap - bp;
      });
      return list;
    }
    if (sortKey === "price_desc") {
      list.sort((a, b) => {
        const ap = getCheapestNightlyAmount(a);
        const bp = getCheapestNightlyAmount(b);
        if (!Number.isFinite(ap) && !Number.isFinite(bp)) return 0;
        if (!Number.isFinite(ap)) return 1;
        if (!Number.isFinite(bp)) return -1;
        return bp - ap;
      });
      return list;
    }
    if (sortKey === "stars") {
      list.sort((a, b) => getHotelStars(b) - getHotelStars(a));
      return list;
    }
    return list;
  }, [filteredResults, sortKey]);

  function clearAllFilters() {
    setDraftRefundableOnly(false);
    setDraftMinStars(0);
    setHasMore(false);
    setLoadingMore(false);
    setSearchResults([]);
    if (priceBounds) {
      const nextMin = String(Math.floor(priceBounds.min));
      const nextMax = String(Math.ceil(priceBounds.max));
      setDraftPriceMin(nextMin);
      setDraftPriceMax(nextMax);
      setAppliedPriceMin(nextMin);
      setAppliedPriceMax(nextMax);
    } else {
      setDraftPriceMin("");
      setDraftPriceMax("");
      setAppliedPriceMin("");
      setAppliedPriceMax("");
    }

    const next = new URLSearchParams(location.search || "");
    next.delete("starRating");
    next.delete("refundable");
    next.delete("boardType");
    navigate(`/search?${next.toString()}`);
    setFiltersOpen(false);
  }

  function applyFilters() {
    setAppliedPriceMin(draftPriceMin);
    setAppliedPriceMax(draftPriceMax);
    setHasMore(false);
    setLoadingMore(false);
    setSearchResults([]);

    const next = new URLSearchParams(location.search || "");
    if (draftMinStars > 0) next.set("starRating", String(draftMinStars));
    else next.delete("starRating");
    if (draftRefundableOnly) next.set("refundable", "true");
    else next.delete("refundable");
    if (appliedBoardType) next.set("boardType", appliedBoardType);
    else next.delete("boardType");
    navigate(`/search?${next.toString()}`);
    setFiltersOpen(false);
  }

  function scrollToTop() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    searchResultsRef.current = searchResults;
  }, [searchResults]);

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
    const starRatingParam = query.get("starRating") || "";
    const refundableParam = query.get("refundable");
    const boardTypeParam = query.get("boardType") || "";

    if (!checkin || !checkout) return;
    if (!city && !placeId && !(latitude && longitude)) return;

    trackOnce(`search:${location.search}`, "search_performed", {
      city: city || undefined,
      countryCode: countryCode || undefined,
      placeId: placeId || undefined,
      checkin,
      checkout,
      adults,
      refundable: refundableParam == null ? undefined : String(refundableParam),
      starRating: starRatingParam || undefined,
      boardType: boardTypeParam || undefined
    });

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
    setHasMore(false);
    setLoadingMore(false);
    setSearchResults([]);
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
      starRating: starRatingParam || "",
      refundable: refundableParam == null ? null : refundableParam,
      boardType: boardTypeParam || "",
      offset: 0,
      limit: BATCH_SIZE,
      environment
    })
      .then((data) => {
        if (cancelled) return;
        const nextRates = Array.isArray(data?.rates) ? data.rates : [];
        setSearchResults(nextRates);
        setHasMore(Boolean(data?.hasMore) && nextRates.length > 0);
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

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
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
    const starRatingParam = query.get("starRating") || "";
    const refundableParam = query.get("refundable");
    const boardTypeParam = query.get("boardType") || "";

    setLoadingMore(true);
    setError(null);
    try {
      const current = searchResultsRef.current || [];
      const data = await searchHotels({
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
        starRating: starRatingParam || "",
        refundable: refundableParam == null ? null : refundableParam,
        boardType: boardTypeParam || "",
        offset: current.length,
        limit: BATCH_SIZE,
        environment
      });
      const nextRates = Array.isArray(data?.rates) ? data.rates : [];
      setSearchResults(mergeByHotelId(current, nextRates));
      setHasMore(Boolean(data?.hasMore) && nextRates.length > 0);
    } catch (err) {
      setError(err?.message || "Failed to load more hotels");
    } finally {
      setLoadingMore(false);
    }
  }, [BATCH_SIZE, environment, hasMore, loading, loadingMore, query, setError, setSearchResults]);

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

  const canonical = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  return (
    <section className="bg-background min-h-[60vh] py-8 sm:py-10">
      <Helmet>
        <title>{title}</title>
        <link rel="canonical" href={canonical} />
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
            <Suspense
              fallback={
                <div className={`rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 ${filtersOpen ? "" : "hidden lg:block"}`}>
                  <div className="h-6 w-24 bg-slate-100 rounded" />
                  <div className="h-20 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                </div>
              }
            >
              <FiltersSidebar
                filtersOpen={filtersOpen}
                setFiltersOpen={setFiltersOpen}
                activeFilterCount={activeFilterCount}
                clearAllFilters={clearAllFilters}
                priceBounds={priceBounds}
                draftPriceMin={draftPriceMin}
                setDraftPriceMin={setDraftPriceMin}
                draftPriceMax={draftPriceMax}
                setDraftPriceMax={setDraftPriceMax}
                draftMinStars={draftMinStars}
                setDraftMinStars={setDraftMinStars}
                draftRefundableOnly={draftRefundableOnly}
                setDraftRefundableOnly={setDraftRefundableOnly}
                applyFilters={applyFilters}
                loading={loading}
              />
            </Suspense>
          </aside>

          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-textMedium">
                <div>
                  {loading
                    ? "Searching…"
                    : activeFilterCount > 0
                    ? `${sortedResults.length} of ${searchResults.length}${hasMore ? "+" : ""} shown`
                    : `${searchResults.length}${hasMore ? "+" : ""} hotel${searchResults.length === 1 ? "" : "s"} loaded`}
                </div>
                <div className="lg:hidden">
                  <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)}>
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-textMedium">
                <span className="text-textLight">Sort</span>
                <select
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="stars">Stars</option>
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
                <div className="font-heading text-lg text-primary">
                  No hotels found
                </div>
                <p className="text-sm text-textMedium max-w-md mx-auto">
                  Try adjusting your dates, choosing a nearby destination, or searching with fewer filters.
                </p>
                <div className="flex justify-center">
                  <Button type="button" variant="secondary" onClick={scrollToTop}>
                    Modify search
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && searchResults.length > 0 && filteredResults.length === 0 && (
              <div className="rounded-2xl bg-white shadow-soft border border-slate-100 p-8 text-center space-y-3">
                <div className="font-heading text-lg text-primary">No matches</div>
                <p className="text-sm text-textMedium max-w-md mx-auto">
                  Try widening your price range, lowering the star minimum, or modifying your search.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2">
                  {hasMore && (
                    <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? "Loading more…" : "Load more hotels"}
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                  <Button type="button" variant="ghost" onClick={scrollToTop}>
                    Modify search
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && sortedResults.length > 0 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedResults.map((rate) => (
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

                {hasMore && (
                  <div className="flex flex-col items-center gap-2">
                    <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? "Loading more…" : "Load more"}
                    </Button>
                    {loadingMore && (
                      <>
                        <div className="text-[11px] text-textLight">Loading more hotels…</div>
                        <div className="w-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <HotelCardSkeleton key={`more-${i}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SearchResultsPage;
