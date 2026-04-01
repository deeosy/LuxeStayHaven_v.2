import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  extractPrebookData,
  initializeLitePayment,
  prebook,
  searchRates
} from "../utils/api.js";
import useSearchStore from "../stores/useSearchStore.js";
import ImageGallery from "../components/hotel/ImageGallery.jsx";
import HotelInfo from "../components/hotel/HotelInfo.jsx";
import RoomList from "../components/hotel/RoomList.jsx";
import { formatCurrency } from "../utils/formatters.js";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}


function HotelDetailsPage() {
  const { hotelId } = useParams();
  const query = useQuery();
  const { adults, environment, checkin, checkout, setDates, setAdults } =
    useSearchStore();

  const [hotelInfo, setHotelInfo] = useState(null);
  const [rateInfo, setRateInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeOffer, setActiveOffer] = useState(null);
  const [prebooking, setPrebooking] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [prebookResponse, setPrebookResponse] = useState(null);
  const [paymentStarted, setPaymentStarted] = useState(false);

  useEffect(() => {
    const checkin = query.get("checkin") || "";
    const checkout = query.get("checkout") || "";
    const adultsFromQuery = Number(query.get("adults") || adults || 2);
    if (checkin && checkout) {
      setDates({ checkin, checkout });
    }
    setAdults(adultsFromQuery);

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchRates({
      checkin,
      checkout,
      adults: adultsFromQuery,
      hotelId,
      environment
    })
      .then((data) => {
        if (cancelled) return;
        setHotelInfo(data.hotelInfo || {});
        setRateInfo(data.rateInfo || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load hotel details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId, query, environment, setDates, setAdults, adults]);

  const resolvedCheckin = useMemo(() => query.get("checkin") || checkin || "", [query, checkin]);
  const resolvedCheckout = useMemo(() => query.get("checkout") || checkout || "", [query, checkout]);
  const resolvedAdults = useMemo(() => Number(query.get("adults") || adults || 2), [query, adults]);

  const handleBookNow = async (offer) => {
    setActiveOffer(offer);
    setPaymentError(null);
    setPrebookResponse(null);
    setPaymentStarted(false);

    const offerId = offer?.offerId;
    if (!offerId) {
      setPaymentError("Missing offerId for this rate.");
      return;
    }

    if (!resolvedCheckin || !resolvedCheckout) {
      setPaymentError(
        "Missing check-in/check-out dates. Please go back and search again."
      );
      return;
    }

    try {
      // Step 1: Prebook (locks availability and returns secretKey when usePaymentSdk=true)
      setPrebooking(true);
      const resp = await prebook({
        offerId,
        checkin: resolvedCheckin,
        checkout: resolvedCheckout,
        adults: resolvedAdults,
        hotelId,
        environment
      });

      const { prebookId, secretKey } = extractPrebookData(resp);
      if (!prebookId || !secretKey) {
        throw new Error(
          "Prebook succeeded but did not include required payment fields (prebookId/secretKey)."
        );
      }

      setPrebookResponse(resp);
    } catch (err) {
      setPaymentError(err.message || "Failed to prebook. Please try again.");
    } finally {
      setPrebooking(false);
    }
  };

  useEffect(() => {
    if (!prebookResponse) return;

    let cancelled = false;

    (async () => {
      try {
        setPaymentError(null);

        const { prebookId, transactionId } = extractPrebookData(prebookResponse);

        // FIXED: Clean returnUrl so LiteAPI can redirect back reliably.
        // IMPORTANT (LiteAPI 2026 docs): you must keep the transactionId from the PREBOOK step (tr_ct_...).
        // We include it in the returnUrl so Confirmation can always finalize the booking.
        const returnUrl = `${window.location.origin}/confirmation?prebookId=${encodeURIComponent(
          prebookId
        )}&transactionId=${encodeURIComponent(transactionId)}`;
        // DEBUG: Check browser console for returnUrl and final URL after redirect
        console.log("=== Payment SDK Init ===");
        console.log("returnUrl sent to LiteAPI:", returnUrl);
        console.log("prebookId:", prebookId);


        // Step 3: Load official LiteAPI Payment SDK and render secure card form.
        // Important: Do NOT pass amount manually when usePaymentSdk=true.
        await initializeLitePayment({
          prebookResponse,
          returnUrl,
          targetElement: "#payment-container",
          environment: environment || "sandbox"
        });

        if (!cancelled) {
          setPaymentStarted(true);
          setTimeout(() => {
            const el = document.getElementById("secure-checkout");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentError(err.message || "Failed to initialize payment.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prebookResponse, environment]);

  return (
    <section className="bg-background py-8 sm:py-10">
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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <ImageGallery hotelInfo={hotelInfo} />
              <HotelInfo hotelInfo={hotelInfo} />
              {!prebookResponse ? (
                <RoomList rateInfo={rateInfo} onSelectOffer={handleBookNow} />
              ) : (
                <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 text-sm text-textMedium">
                  Secure payment is ready in the panel on the right.
                </div>
              )}
            </div>
            <div className="lg:sticky lg:top-20 h-fit">
              <aside
                id="secure-checkout"
                className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 text-sm"
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-textLight">
                    Secure checkout
                  </div>
                  <div className="font-heading text-lg text-primary">
                    {hotelInfo?.hotelName || hotelInfo?.name || "Select a room"}
                  </div>
                </div>

                {activeOffer ? (
                  <div className="rounded-xl bg-background px-3 py-2 text-xs text-textMedium">
                    <div className="flex justify-between">
                      <span>Selected</span>
                      <span className="font-medium text-textDark">
                        {activeOffer.rateName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(activeOffer.retailRate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-textMedium">
                    Select a rate to load the secure payment form.
                  </div>
                )}

                {environment === "sandbox" && (
                  <div className="rounded-xl bg-warning/5 border border-warning/20 px-3 py-2 text-xs text-warning">
                    Sandbox mode: use test card 4242 4242 4242 4242, any future expiry, any 3-digit CVV.
                  </div>
                )}

                {paymentError && (
                  <div className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
                    {paymentError}
                  </div>
                )}

                <div className="space-y-2">
                  {prebooking && (
                    <div className="text-xs text-textMedium flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      Preparing secure checkout…
                    </div>
                  )}

                  {prebookResponse && (
                    <div className="text-[11px] text-textLight">
                      Ref: {extractPrebookData(prebookResponse).prebookId}
                    </div>
                  )}

                  {prebookResponse && (
                    <div
                      id="payment-container"
                      className="mt-2 border border-slate-100 rounded-xl p-4 bg-white"
                    />
                  )}

                  {paymentStarted && (
                    <div className="text-[11px] text-textLight">
                      Securely complete your booking in the payment form above.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default HotelDetailsPage;
