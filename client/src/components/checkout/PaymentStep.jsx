import React, { useEffect, useRef, useState } from "react";
import useBookingStore from "../../stores/useBookingStore.js";
import useSearchStore from "../../stores/useSearchStore.js";
import { extractPrebookData, initializeLitePayment, prebook } from "../../utils/api.js";

function PaymentStep() {
  const { selectedOffer, guestDetails, prebookData, setPrebookData, setStep } =
    useBookingStore();
  const { checkin, checkout, adults, environment } = useSearchStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);
  const initInFlight = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prebookId = params.get("prebookId");
    const transactionId =
      params.get("transactionId") ||
      params.get("transactionID") ||
      params.get("transaction_id") ||
      params.get("payment_intent");

    if (prebookId && transactionId) {
      setStep("confirmation");
    }
  }, [setStep]);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (initInFlight.current) return;
    if (!selectedOffer?.offerId) return;
    if (!checkin || !checkout) return;

    let cancelled = false;
    initInFlight.current = true;
    hasInitialized.current = true;

    (async () => {
      try {
        // Step 1: Prebook (locks the offer and returns secretKey when usePaymentSdk=true)
        setLoading(true);
        setError(null);

        const prebookResponse = await prebook({
          offerId: selectedOffer.offerId,
          hotelId: selectedOffer.hotelId,
          checkin,
          checkout,
          adults,
          environment
        });

        const { prebookId, transactionId, secretKey } =
          extractPrebookData(prebookResponse);

        if (!prebookId || !transactionId || !secretKey) {
          throw new Error("Prebook response missing required payment fields.");
        }

        // Store for reference/debugging
        setPrebookData({ prebookId, transactionId, secretKey });

        // Step 2: Build returnUrl back to /checkout so step can advance to confirmation.
        // Important: We include the PREBOOK transactionId (tr_ct_...) so booking finalization uses the correct reference.
        const returnUrl = `${window.location.origin}/checkout?prebookId=${encodeURIComponent(
          prebookId
        )}&transactionId=${encodeURIComponent(
          transactionId
        )}&environment=${encodeURIComponent(environment || "sandbox")}`;

        // Step 3: Load the official LiteAPI Payment SDK and render the secure card form.
        // Do NOT pass amount manually when usePaymentSdk=true.
        await initializeLitePayment({
          prebookResponse,
          returnUrl,
          targetElement: "#payment-container",
          environment: environment || "sandbox"
        });
        if (cancelled) return;
      } catch (err) {
        if (!cancelled) {
          hasInitialized.current = false;
          setError(err.message || "Failed to initialize payment.");
        }
      } finally {
        if (!cancelled) setLoading(false);
        initInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    adults,
    checkin,
    checkout,
    environment,
    selectedOffer,
    setPrebookData
  ]);

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 text-sm">
      <div>
        <h2 className="font-heading text-lg text-primary mb-1">Payment</h2>
        <p className="text-xs text-textMedium">
          Securely complete your booking. The payment form below is provided by LiteAPI.
        </p>
      </div>

      {environment === "sandbox" && (
        <div className="rounded-xl bg-warning/5 border border-warning/20 px-3 py-2 text-xs text-warning">
          Sandbox mode: use test card 4242 4242 4242 4242, any future expiry, any 3-digit CVC.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-xs text-textMedium flex items-center gap-2">
          <span className="h-3.5 w-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          Preparing secure checkout…
        </div>
      )}

      {prebookData?.prebookId && (
        <div className="text-[11px] text-textLight">
          Ref: {prebookData.prebookId}
          {guestDetails?.email ? ` · ${guestDetails.email}` : ""}
        </div>
      )}

      <div
        id="payment-container"
        className="mt-2 border border-slate-100 rounded-xl p-4 bg-white"
      />
    </section>
  );
}

export default PaymentStep;
