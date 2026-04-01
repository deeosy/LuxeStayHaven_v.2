import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { prebookOffer, searchRates } from "../utils/api.js";
import useSearchStore from "../stores/useSearchStore.js";
import ImageGallery from "../components/hotel/ImageGallery.jsx";
import HotelInfo from "../components/hotel/HotelInfo.jsx";
import RoomList from "../components/hotel/RoomList.jsx";
import { formatCurrency } from "../utils/formatters.js";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function loadLitePaymentSdk() {
  if (typeof window !== "undefined" && window.LiteAPIPayment) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-liteapi-payment="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load payment SDK")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";
    script.async = true;
    script.setAttribute("data-liteapi-payment", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment SDK"));
    document.head.appendChild(script);
  });
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
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [prebookMeta, setPrebookMeta] = useState(null);

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
    setPaymentReady(false);
    setPrebookMeta(null);

    const offerId = offer?.offerId;
    if (!offerId) {
      setPaymentError("Missing offerId for this rate.");
      return;
    }

    if (!resolvedCheckin || !resolvedCheckout) {
      setPaymentError("Missing check-in/check-out dates. Please go back and search again.");
      return;
    }

    try {
      setPaymentLoading(true);
      const prebookResponse = await prebookOffer({
        offerId,
        checkin: resolvedCheckin,
        checkout: resolvedCheckout,
        adults: resolvedAdults,
        hotelId,
        environment
      });

      const success = prebookResponse?.success?.data || prebookResponse?.success || prebookResponse?.data;
      const secretKey = success?.secretKey;
      const prebookId = success?.prebookId;
      const transactionId = success?.transactionId;
      const currency = success?.price?.currency || "USD";
      const amount = success?.price?.amount;

      if (!secretKey || !prebookId || !transactionId) {
        throw new Error("Prebook did not return payment details. Ensure usePaymentSdk is enabled.");
      }

      setPrebookMeta({ prebookId, transactionId });

      await loadLitePaymentSdk();

      const publicKey = environment === "sandbox" ? "sandbox" : "live";
      const returnUrl = `${window.location.origin}/confirmation?prebookId=${encodeURIComponent(
        prebookId
      )}&transactionId=${encodeURIComponent(
        transactionId
      )}&environment=${encodeURIComponent(environment || "")}`;

      const config = {
        publicKey,
        secretKey,
        targetElement: "#payment-container",
        returnUrl,
        amount: amount || 0,
        currency,
        submitButton: { text: "Pay" },
        options: {
          business: { name: "LuxeStayHaven" }
        }
      };

      const container = document.querySelector("#payment-container");
      if (container) container.innerHTML = "";

      const payment = new window.LiteAPIPayment(config);
      payment.handlePayment();
      setPaymentReady(true);
      setTimeout(() => {
        const el = document.querySelector("#secure-checkout");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setPaymentError(err.message || "Failed to initialize payment");
    } finally {
      setPaymentLoading(false);
    }
  };

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
              <RoomList rateInfo={rateInfo} onSelectOffer={handleBookNow} />
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

                {paymentError && (
                  <div className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
                    {paymentError}
                  </div>
                )}

                <div className="space-y-2">
                  {paymentLoading && (
                    <div className="text-xs text-textMedium flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      Loading secure payment…
                    </div>
                  )}
                  {prebookMeta && (
                    <div className="text-[11px] text-textLight">
                      Ref: {prebookMeta.prebookId}
                    </div>
                  )}
                  <div
                    id="payment-container"
                    className={`w-full ${paymentReady ? "" : "min-h-[140px]"}`}
                  />
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
