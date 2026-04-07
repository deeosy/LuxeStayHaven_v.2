import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { searchRates } from "../utils/api.js";
import useSearchStore from "../stores/useSearchStore.js";
import useBookingStore from "../stores/useBookingStore.js";
import ImageGallery from "../components/hotel/ImageGallery.jsx";
import RoomCard from "../components/hotel/RoomCard.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { formatCurrency } from "../utils/formatters.js";
import { trackOnce, trackEvent } from "../utils/analytics.js";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function startOfDayISO(value) {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function nightsBetween(checkin, checkout) {
  const ci = startOfDayISO(checkin);
  const co = startOfDayISO(checkout);
  if (!ci || !co) return 0;
  const ms = co.getTime() - ci.getTime();
  const nights = Math.round(ms / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
}

function stripHtml(value) {
  const raw = String(value || "");
  const withBreaks = raw.replace(/<\s*br\s*\/?>/gi, "\n");
  const noTags = withBreaks.replace(/<[^>]*>/g, " ");
  return noTags.replace(/\s+/g, " ").trim();
}

function hashStringToIndex(value, modulo) {
  const m = Number(modulo);
  if (!Number.isFinite(m) || m <= 0) return 0;
  const s = String(value || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % m;
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
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [localSearch, setLocalSearch] = useState({
    checkin: "",
    checkout: "",
    adults: 2
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");

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

  useEffect(() => {
    if (!hotelInfo || loading || error) return;
    const name = hotelInfo?.hotelName || hotelInfo?.name || "";
    trackOnce(`hotel_view:${hotelId}:${resolvedCheckin}:${resolvedCheckout}:${resolvedAdults}`, "hotel_viewed", {
      hotel_id: hotelId,
      hotel_name: name || undefined,
      checkin: resolvedCheckin || undefined,
      checkout: resolvedCheckout || undefined,
      adults: resolvedAdults
    });
  }, [error, hotelId, hotelInfo, loading, resolvedAdults, resolvedCheckin, resolvedCheckout]);

  const flattenedOffers = useMemo(() => {
    const flat = (rateInfo || []).flat();
    return Array.isArray(flat) ? flat : [];
  }, [rateInfo]);

  const bestOfferId = useMemo(() => {
    const list = flattenedOffers;
    if (list.length === 0) return "";
    const refundable = list.filter((o) => o?.refundableTag === "RFN");
    const pickFrom = refundable.length > 0 ? refundable : list;
    const best = pickFrom.reduce((acc, cur) => {
      const n = Number(cur?.retailRate);
      if (!Number.isFinite(n)) return acc;
      if (!acc) return cur;
      const a = Number(acc?.retailRate);
      if (!Number.isFinite(a)) return cur;
      return n < a ? cur : acc;
    }, null);
    return best?.offerId || "";
  }, [flattenedOffers]);

  const hotelImages = useMemo(() => {
    const list = Array.isArray(hotelInfo?.hotelImages) ? hotelInfo.hotelImages : [];
    return list;
  }, [hotelInfo?.hotelImages]);

  const minPerNight = useMemo(() => {
    const nights = nightsBetween(resolvedCheckin, resolvedCheckout) || 1;
    const minTotal = flattenedOffers.reduce((acc, o) => {
      const n = Number(o?.retailRate);
      if (!Number.isFinite(n)) return acc;
      return acc == null ? n : Math.min(acc, n);
    }, null);
    if (minTotal == null) return null;
    return minTotal / nights;
  }, [flattenedOffers, resolvedCheckin, resolvedCheckout]);

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

    trackEvent("booking_started", {
      event_category: "ecommerce",
      event_label: selectedRoom.offerId,
      hotel_id: hotelId,
      hotel_name: (hotelInfo?.hotelName || hotelInfo?.name || "") || undefined,
      offer_id: selectedRoom.offerId,
      checkin: resolvedCheckin,
      checkout: resolvedCheckout,
      adults: resolvedAdults,
      currency: "USD",
      value:
        selectedRoom?.retailRate != null && Number.isFinite(Number(selectedRoom.retailRate))
          ? Number(selectedRoom.retailRate)
          : undefined,
      items: [
        {
          item_id: hotelId,
          item_name: (hotelInfo?.hotelName || hotelInfo?.name || "Hotel"),
          price:
            selectedRoom?.retailRate != null && Number.isFinite(Number(selectedRoom.retailRate))
              ? Number(selectedRoom.retailRate)
              : undefined,
          quantity: 1
        }
      ]
    });

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

  const handleUpdateRates = async () => {
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
    <section className="bg-background pb-10 sm:pb-14">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex items-center justify-between text-xs text-textLight mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 hover:text-primary"
          >
            <span>‹</span>
            Back
          </button>
        </div>

        {loading && <div className="text-sm text-textMedium">Loading hotel details…</div>}
        {!loading && error && (
          <div className="rounded-xl bg-white border border-error/20 p-4 text-sm text-error">
            {error}
          </div>
        )}

        {!loading && !error && hotelInfo && (
          <div className="space-y-8">
            <ImageGallery hotelInfo={hotelInfo} />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
              <div className="min-w-0 order-2 lg:order-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-textLight">
                      <span className="text-accent">{Number(hotelInfo?.starRating || hotelInfo?.stars || 0) || 0} ★</span>
                      <span>—</span>
                      <span>
                        Loved by{" "}
                        {Number(hotelInfo?.reviewCount || hotelInfo?.reviewsCount || hotelInfo?.reviews || 117) || 117}
                        + travelers
                      </span>
                    </div>
                    <h1 className="mt-2 font-heading text-3xl sm:text-4xl text-primary leading-tight">
                      {hotelInfo?.hotelName || hotelInfo?.name || "Hotel"}
                    </h1>
                    <div className="mt-2 text-sm text-textMedium">
                      {hotelInfo?.address || hotelInfo?.cityName || hotelInfo?.city || ""}
                      {hotelInfo?.country ? `, ${hotelInfo.country}` : ""}
                      <span className="mx-2 text-textLight">·</span>
                      Trusted by international travelers
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-b border-slate-100">
                  <div className="flex items-center gap-6 text-sm">
                    {[
                      { key: "rooms", label: "Rooms" },
                      { key: "overview", label: "Overview" },
                      { key: "reviews", label: "Reviews" }
                    ].map((t) => {
                      const active = activeTab === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setActiveTab(t.key)}
                          className={`relative py-3 font-medium transition ${
                            active ? "text-primary" : "text-textMedium hover:text-primary"
                          }`}
                        >
                          {t.label}
                          {active && (
                            <motion.div
                              layoutId="hotel-tabs-underline"
                              className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-accent"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  {activeTab === "rooms" && (
                    <div className="space-y-4">
                      <div className="text-xl font-heading text-primary">
                        Choose your room rate
                      </div>
                      {flattenedOffers.length === 0 ? (
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-5 text-sm text-textMedium">
                          No rooms available for your dates. Try adjusting your stay.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {flattenedOffers.map((offer, index) => (
                            <RoomCard
                              key={`${offer.offerId}-${index}`}
                              offer={{
                                ...offer,
                                isBestDeal: bestOfferId && offer.offerId === bestOfferId,
                                hotelImages,
                                imageIndex: hashStringToIndex(offer?.offerId || index, hotelImages.length),
                                hotelMainPhoto: hotelInfo?.main_photo || ""
                              }}
                              selected={selectedRoom?.offerId === offer.offerId}
                              onSelect={() => handleSelectRoom(offer)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "overview" && (
                    <div className="space-y-4">
                      <div className="text-xl font-heading text-primary">
                        Overview
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-5 text-sm text-textMedium leading-relaxed">
                        {stripHtml(
                          hotelInfo?.hotelDescription ||
                            hotelInfo?.description ||
                            hotelInfo?.hotelInfo ||
                            ""
                        ) || "A refined stay with curated comfort and premium amenities."}
                      </div>
                    </div>
                  )}

                  {activeTab === "reviews" && (
                    <div className="space-y-4">
                      <div className="text-xl font-heading text-primary">
                        Reviews
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-6 text-sm text-textMedium">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-accent">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
                            </svg>
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium text-textDark">Verified reviews coming soon</div>
                            <div className="text-textMedium">
                              We’re preparing a cleaner, verified review experience. For now, explore Rooms and Overview for the details that matter most.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:sticky lg:top-20">
                <aside className="rounded-2xl bg-white border border-slate-100 shadow-soft p-5 space-y-4 text-sm">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs text-textLight">From</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-semibold text-primary">
                          {minPerNight != null ? formatCurrency(minPerNight) : "—"}
                        </div>
                        <div className="text-xs text-textLight">/ night</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-textLight text-right">
                      Prices may increase
                    </div>
                  </div>

                  <div className="rounded-xl bg-background border border-slate-100 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="sidebar-checkin"
                        type="date"
                        label="Check in"
                        value={localSearch.checkin}
                        onChange={(e) =>
                          setLocalSearch((p) => ({ ...p, checkin: e.target.value }))
                        }
                      />
                      <Input
                        id="sidebar-checkout"
                        type="date"
                        label="Check out"
                        value={localSearch.checkout}
                        onChange={(e) =>
                          setLocalSearch((p) => ({ ...p, checkout: e.target.value }))
                        }
                      />
                    </div>
                    <Input
                      id="sidebar-adults"
                      type="number"
                      min={1}
                      label="Guests"
                      value={localSearch.adults}
                      onChange={(e) =>
                        setLocalSearch((p) => ({ ...p, adults: e.target.value }))
                      }
                    />
                    <Button type="button" className="w-full" onClick={handleUpdateRates}>
                      {refreshing ? "Updating…" : "Update rates"}
                    </Button>
                    <div className="text-[11px] text-textLight">
                      Prices may increase — secure your rate now
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                      Selected
                    </div>
                    {selectedRoom ? (
                      <div className="rounded-xl bg-background border border-slate-100 p-4 space-y-3">
                        <div className="font-medium text-textDark">
                          {selectedRoom.rateName}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {selectedRoom.board ? <Badge color="info">{selectedRoom.board}</Badge> : null}
                          {selectedRoom.refundableTag === "RFN" ? (
                            <Badge color="success">Refundable</Badge>
                          ) : (
                            <Badge color="error">Non-refundable</Badge>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-xs text-textMedium">
                            Total for {nightsBetween(resolvedCheckin, resolvedCheckout) || 1} night
                            {nightsBetween(resolvedCheckin, resolvedCheckout) === 1 ? "" : "s"}
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            {formatCurrency(selectedRoom.retailRate)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-textMedium">
                        Select a room to continue to checkout.
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={!selectedRoom?.offerId}
                    onClick={handleContinue}
                  >
                    Continue to Checkout →
                  </Button>
                </aside>
              </div>
            </div>

            {selectedRoom && (
              <>
                <div className="h-20 lg:hidden" />
                <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
                  <div className="max-w-6xl mx-auto px-4 pb-[env(safe-area-inset-bottom)]">
                    <div className="rounded-2xl bg-white/92 backdrop-blur border border-slate-200 shadow-soft p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Selected
                        </div>
                        <div className="text-sm font-medium text-textDark truncate">
                          {selectedRoom.rateName}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] text-textLight">Total</div>
                          <div className="text-base font-semibold text-primary">
                            {formatCurrency(selectedRoom.retailRate)}
                          </div>
                        </div>
                        <Button type="button" onClick={handleContinue}>
                          Continue →
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default HotelDetailsPage;
