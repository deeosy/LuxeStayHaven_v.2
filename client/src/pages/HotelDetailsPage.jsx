import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { searchRates } from "../utils/api.js";
import useSearchStore from "../stores/useSearchStore.js";
import useBookingStore from "../stores/useBookingStore.js";
import ImageGallery from "../components/hotel/ImageGallery.jsx";
import HotelInfo from "../components/hotel/HotelInfo.jsx";
import RoomList from "../components/hotel/RoomList.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}


function HotelDetailsPage() {
  const { hotelId } = useParams();
  const query = useQuery();
  const navigate = useNavigate();
  const { adults, environment, checkin, checkout, setDates, setAdults } =
    useSearchStore();
  const { resetCheckout, setSelectedHotel, setSelectedOffer, setStep } =
    useBookingStore();

  const [hotelInfo, setHotelInfo] = useState(null);
  const [rateInfo, setRateInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Sidebar selection state (select a room first, then continue to checkout).
  const [selectedRoom, setSelectedRoom] = useState(null);
  // Sidebar search controls (dates/guests) to refresh hotel rates in-place.
  const [modifyOpen, setModifyOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState({
    checkin: "",
    checkout: "",
    adults: 2
  });
  const [refreshing, setRefreshing] = useState(false);

  const resolvedCheckin = useMemo(
    () => query.get("checkin") || checkin || "",
    [query, checkin]
  );
  const resolvedCheckout = useMemo(
    () => query.get("checkout") || checkout || "",
    [query, checkout]
  );
  const resolvedAdults = useMemo(
    () => Number(query.get("adults") || adults || 2),
    [query, adults]
  );

  const fetchRates = useCallback(
    async ({ nextCheckin, nextCheckout, nextAdults, showSpinner }) => {
      const withSpinner = Boolean(showSpinner);
      if (withSpinner) setRefreshing(true);
      setError(null);
      try {
        // Refresh rates for the current hotel using the active search (dates/guests).
        const data = await searchRates({
          checkin: nextCheckin,
          checkout: nextCheckout,
          adults: nextAdults,
          hotelId,
          environment
        });
        setHotelInfo(data.hotelInfo || {});
        setRateInfo(data.rateInfo || []);
      } catch (err) {
        setError(err.message || "Failed to load hotel details");
      } finally {
        if (withSpinner) setRefreshing(false);
      }
    },
    [environment, hotelId]
  );

  useEffect(() => {
    const adultsFromQuery = resolvedAdults;
    if (resolvedCheckin && resolvedCheckout) {
      setDates({ checkin: resolvedCheckin, checkout: resolvedCheckout });
    }
    setAdults(adultsFromQuery);
    setLocalSearch({
      checkin: resolvedCheckin,
      checkout: resolvedCheckout,
      adults: adultsFromQuery
    });

    let cancelled = false;
    setLoading(true);
    setSelectedRoom(null);

    (async () => {
      await fetchRates({
        nextCheckin: resolvedCheckin,
        nextCheckout: resolvedCheckout,
        nextAdults: adultsFromQuery,
        showSpinner: false
      });
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchRates, resolvedAdults, resolvedCheckin, resolvedCheckout, setAdults, setDates]);

  const handleSelectRoom = (offer) => {
    const offerId = offer?.offerId;
    if (!offerId) {
      setError("Missing offerId for this rate.");
      return;
    }
    setSelectedRoom({ ...offer, offerId, hotelId });
    setSelectedHotel({ ...hotelInfo, hotelId });
    setSelectedOffer({ ...offer, offerId, hotelId });
  };

  const handleContinue = () => {
    if (!selectedRoom?.offerId) return;
    if (!resolvedCheckin || !resolvedCheckout) {
      setError("Missing check-in/check-out dates. Please go back and search again.");
      return;
    }

    resetCheckout();
    setSelectedHotel({ ...hotelInfo, hotelId });
    setSelectedOffer({ ...selectedRoom, hotelId });
    setStep("details");

    navigate(
      `/checkout?hotelId=${encodeURIComponent(hotelId)}&offerId=${encodeURIComponent(
        selectedRoom.offerId
      )}&checkin=${encodeURIComponent(resolvedCheckin)}&checkout=${encodeURIComponent(
        resolvedCheckout
      )}&adults=${encodeURIComponent(String(resolvedAdults))}&environment=${encodeURIComponent(
        environment || "sandbox"
      )}`
    );
  };

  const handleApplySearch = async () => {
    if (!localSearch.checkin || !localSearch.checkout) return;

    setDates({ checkin: localSearch.checkin, checkout: localSearch.checkout });
    setAdults(Number(localSearch.adults) || 2);
    setSelectedRoom(null);

    navigate(
      `/hotel/${encodeURIComponent(hotelId)}?checkin=${encodeURIComponent(
        localSearch.checkin
      )}&checkout=${encodeURIComponent(
        localSearch.checkout
      )}&adults=${encodeURIComponent(String(Number(localSearch.adults) || 2))}`
    );

    await fetchRates({
      nextCheckin: localSearch.checkin,
      nextCheckout: localSearch.checkout,
      nextAdults: Number(localSearch.adults) || 2,
      showSpinner: true
    });
    setModifyOpen(false);
  };

  const seo = useMemo(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const name = hotelInfo?.hotelName || hotelInfo?.name || "Luxury hotel";
    const city = hotelInfo?.cityName || hotelInfo?.city || "";
    const address = hotelInfo?.address || "";
    const title = city
      ? `Book ${name} in ${city} - LuxeStayHaven`
      : `Book ${name} - LuxeStayHaven`;

    const flattened = (rateInfo || []).flat();
    const min = flattened.reduce((acc, o) => {
      const n = Number(o?.retailRate);
      if (!Number.isFinite(n)) return acc;
      return acc == null ? n : Math.min(acc, n);
    }, null);

    const description = resolvedCheckin && resolvedCheckout
      ? `Reserve ${name}${city ? ` in ${city}` : ""} for ${resolvedCheckin} to ${resolvedCheckout}. Premium stays, secure checkout, and curated room options.`
      : `Reserve ${name}${city ? ` in ${city}` : ""}. Premium stays, secure checkout, and curated room options.`;

    const canonical = `${baseUrl}/hotel/${encodeURIComponent(hotelId)}`;
    const ogImage =
      hotelInfo?.images?.[0] || hotelInfo?.image || hotelInfo?.mainImage || "";

    const hotelSchema = {
      "@context": "https://schema.org",
      "@type": "Hotel",
      name,
      url: canonical,
      address: address
        ? {
            "@type": "PostalAddress",
            streetAddress: address
          }
        : undefined
    };

    const offerSchema =
      min != null
        ? {
            "@context": "https://schema.org",
            "@type": "Offer",
            name: `Rooms at ${name}`,
            price: String(min),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: canonical
          }
        : null;

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${baseUrl}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Hotels",
          item: `${baseUrl}/search`
        },
        {
          "@type": "ListItem",
          position: 3,
          name,
          item: canonical
        }
      ]
    };

    return {
      title,
      description,
      canonical,
      ogImage,
      hotelSchema,
      offerSchema,
      breadcrumbSchema
    };
  }, [hotelId, hotelInfo, rateInfo, resolvedCheckin, resolvedCheckout]);

  return (
    <section className="bg-background py-8 sm:py-10">
      <Helmet>
        <title>{seo.title}</title>
        <link rel="canonical" href={seo.canonical} />
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="website" />
        {seo.ogImage ? <meta property="og:image" content={seo.ogImage} /> : null}
        <script type="application/ld+json">
          {JSON.stringify(seo.hotelSchema)}
        </script>
        {seo.offerSchema ? (
          <script type="application/ld+json">
            {JSON.stringify(seo.offerSchema)}
          </script>
        ) : null}
        <script type="application/ld+json">
          {JSON.stringify(seo.breadcrumbSchema)}
        </script>
      </Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && (
          <div className="text-sm text-textMedium">Loading hotel details…</div>
        )}
        {!loading && error && (
          <div className="rounded-xl bg-white border border-error/20 p-4 text-sm text-error">
            {error}
          </div>
        )}
        {!loading && !error && hotelInfo && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
            <div className="space-y-6 min-w-0">
              <ImageGallery hotelInfo={hotelInfo} />
              <HotelInfo hotelInfo={hotelInfo} />
              <RoomList
                rateInfo={rateInfo}
                onSelectOffer={handleSelectRoom}
                selectedOfferId={selectedRoom?.offerId}
              />
            </div>

            <div className="lg:sticky lg:top-20 h-fit">
              <aside className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                      Your search
                    </div>
                    <div className="mt-1 text-sm text-textDark font-medium">
                      {resolvedCheckin && resolvedCheckout
                        ? `${formatDate(resolvedCheckin)} – ${formatDate(resolvedCheckout)}`
                        : "Select dates"}
                    </div>
                    <div className="text-xs text-textMedium">
                      {resolvedAdults} guest{resolvedAdults > 1 ? "s" : ""}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setModifyOpen((v) => !v)}
                  >
                    Modify
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {modifyOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            id="modify-checkin"
                            type="date"
                            label="Check-in"
                            value={localSearch.checkin}
                            onChange={(e) =>
                              setLocalSearch((p) => ({
                                ...p,
                                checkin: e.target.value
                              }))
                            }
                          />
                          <Input
                            id="modify-checkout"
                            type="date"
                            label="Check-out"
                            value={localSearch.checkout}
                            onChange={(e) =>
                              setLocalSearch((p) => ({
                                ...p,
                                checkout: e.target.value
                              }))
                            }
                          />
                        </div>
                        <Input
                          id="modify-adults"
                          type="number"
                          min={1}
                          label="Guests"
                          value={localSearch.adults}
                          onChange={(e) =>
                            setLocalSearch((p) => ({
                              ...p,
                              adults: e.target.value
                            }))
                          }
                        />
                        <Button type="button" className="w-full" onClick={handleApplySearch}>
                          {refreshing ? "Refreshing…" : "Apply"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                    Selected room
                  </div>
                  <AnimatePresence initial={false} mode="wait">
                    {selectedRoom ? (
                      <motion.div
                        key="selected"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="rounded-xl bg-background border border-slate-100 p-3 space-y-2"
                      >
                        <div className="font-medium text-textDark">
                          {selectedRoom.rateName}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {selectedRoom.board && (
                            <Badge color="info">{selectedRoom.board}</Badge>
                          )}
                          {selectedRoom.refundableTag === "RFN" ? (
                            <Badge color="success">Refundable</Badge>
                          ) : (
                            <Badge color="error">Non-refundable</Badge>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-xs text-textMedium">Total</div>
                          <div className="text-base font-semibold text-primary">
                            {formatCurrency(selectedRoom.retailRate)}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="none"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="text-xs text-textMedium"
                      >
                        Select a room to continue to checkout.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={!selectedRoom?.offerId}
                  onClick={handleContinue}
                >
                  Continue to Checkout →
                </Button>

                {refreshing && (
                  <div className="text-[11px] text-textLight">
                    Updating available rates…
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default HotelDetailsPage;
