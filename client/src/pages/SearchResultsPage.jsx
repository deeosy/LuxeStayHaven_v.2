import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import useSearchStore from "../stores/useSearchStore.js";
import { searchHotels } from "../utils/api.js";
import HotelCard from "../components/search/HotelCard.jsx";
import HotelCardSkeleton from "../components/search/HotelCardSkeleton.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import GuestSelector from "../components/ui/GuestSelector.jsx";
import { formatDate } from "../utils/formatters.js";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
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
  const [localCity, setLocalCity] = useState(query.get("city") || "");
  const [localCheckin, setLocalCheckin] = useState(
    query.get("checkin") || storeCheckin || ""
  );
  const [localCheckout, setLocalCheckout] = useState(
    query.get("checkout") || storeCheckout || ""
  );
  const [localAdults, setLocalAdults] = useState(
    Number(query.get("adults") || storeAdults || 2)
  );

  useEffect(() => {
    setLocalCity(query.get("city") || "");
    setLocalCheckin(query.get("checkin") || storeCheckin || "");
    setLocalCheckout(query.get("checkout") || storeCheckout || "");
    setLocalAdults(Number(query.get("adults") || storeAdults || 2));
  }, [query, storeCheckin, storeCheckout, storeAdults]);

  useEffect(() => {
    const city = query.get("city");
    const countryCode = query.get("countryCode") || "";
    const checkin = query.get("checkin") || "";
    const checkout = query.get("checkout") || "";
    const adults = Number(query.get("adults") || 2);

    if (!city || !checkin || !checkout) return;

    setDestination({ placeId: null, destinationName: `${city}, ${countryCode}` });
    setDates({ checkin, checkout });
    setAdults(adults);

    let cancelled = false;
    setLoading(true);
    setError(null);
    searchHotels({
      checkin,
      checkout,
      adults,
      city,
      countryCode: countryCode.toUpperCase(),
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const city = localCity.trim();
              if (!city || !localCheckin || !localCheckout) return;

              const next = new URLSearchParams();
              next.set("city", city);
              next.set("checkin", localCheckin);
              next.set("checkout", localCheckout);
              next.set("adults", String(localAdults || 2));

              const countryFromQuery = (query.get("countryCode") || "").trim();
              const countryFromStore = (destinationName || "")
                .split(",")
                .pop()
                ?.trim();
              const countryCode = (countryFromQuery || countryFromStore || "")
                .toUpperCase();
              if (countryCode) next.set("countryCode", countryCode);

              navigate(`/search?${next.toString()}`);
            }}
            className="w-full max-w-6xl mx-auto rounded-2xl bg-white/30 backdrop-blur shadow-soft p-4 sm:p-5 space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.6fr)_auto] items-end">
              <Input
                id="city"
                name="city"
                label="Destination"
                placeholder="e.g. Paris"
                value={localCity}
                onChange={(e) => setLocalCity(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="checkin"
                  name="checkin"
                  label="Check-in"
                  type="date"
                  value={localCheckin}
                  onChange={(e) => setLocalCheckin(e.target.value)}
                />
                <Input
                  id="checkout"
                  name="checkout"
                  label="Check-out"
                  type="date"
                  value={localCheckout}
                  onChange={(e) => setLocalCheckout(e.target.value)}
                />
              </div>

              <GuestSelector value={localAdults || 2} onChange={setLocalAdults} />

              <div className="flex items-end">
                <Button type="submit" className="w-full h-[42px] sm:h-[44px]">
                  Search
                </Button>
              </div>
            </div>
          </form>
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
                    )} · ${storeAdults} guest${storeAdults > 1 ? "s" : ""}`
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
