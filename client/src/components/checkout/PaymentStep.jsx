import React, { useEffect, useMemo, useRef, useState } from "react";
import useBookingStore from "../../stores/useBookingStore.js";
import useSearchStore from "../../stores/useSearchStore.js";
import { prebook, completeBooking } from "../../utils/api.js";
import { formatCurrency } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";


function PaymentStep() {
  const {
    selectedOffer,
    prebookData,
    setPrebookData,
    guestDetails,
    setBookingConfirmation,
    setStep
  } = useBookingStore();
  const { environment } = useSearchStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);

  const redirectData = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const prebookId = params.get("prebookId");
    const transactionId = params.get("transactionId");
    if (prebookId && transactionId) {
      return { prebookId, transactionId };
    }
    return null;
  }, []);

  useEffect(() => {
    if (!selectedOffer || hasInitialized.current || prebookData) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    prebook({ rateId: selectedOffer.offerId, environment })
      .then((data) => {
        if (cancelled) return;
        const success = data.success?.data || data.success;
        if (!success) throw new Error("Invalid prebook response");
        const payload = {
          prebookId: success.prebookId,
          transactionId: success.transactionId,
          secretKey: success.secretKey,
          price: success.price?.amount,
          currency: success.price?.currency
        };
        setPrebookData(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to prepare payment");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOffer, environment, prebookData, setPrebookData]);

  useEffect(() => {
    if (!prebookData || hasInitialized.current) return;
    if (typeof window.initializePaymentForm !== "function") return;
    hasInitialized.current = true;
    window.initializePaymentForm(
      prebookData.secretKey,
      prebookData.prebookId,
      prebookData.transactionId,
      guestDetails.firstName,
      guestDetails.lastName,
      guestDetails.email,
      environment
    );
  }, [prebookData, guestDetails]);

  useEffect(() => {
    // Handle redirect back from LiteAPI with booking parameters
    const params = new URLSearchParams(window.location.search);
    const prebookId = params.get("prebookId");
    const transactionId = params.get("transactionId");
    const firstName = params.get("guestFirstName");
    const lastName = params.get("guestLastName");
    const email = params.get("guestEmail");

    if (prebookId && transactionId && !hasInitialized.current) {
      hasInitialized.current = true;
      handleComplete({
        prebookId,
        transactionId,
        firstName,
        lastName,
        email,
        environment: params.get("environment") || environment
      });
    }
  }, []);

  const handleComplete = async (redirectData = null) => {
    const data = redirectData || {
      prebookId: prebookData?.prebookId,
      transactionId: prebookData?.transactionId,
      firstName: guestDetails.firstName,
      lastName: guestDetails.lastName,
      email: guestDetails.email,
      environment
    };

    if (!data.prebookId || !data.transactionId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await completeBooking(data);
      
      if (result.success && result.data) {
        setBookingConfirmation(result.data);
        setStep("confirmation");
        // Clear query params if we came from a redirect
        if (redirectData) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        throw new Error("Booking failed");
      }
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 text-sm">
      <div>
        <h2 className="font-heading text-lg text-primary mb-1">Payment</h2>
        <p className="text-xs text-textMedium">
          Securely complete your booking with our payment partner.
        </p>
      </div>
      {selectedOffer && (
        <div className="rounded-xl bg-background px-3 py-2 text-xs text-textMedium">
          <div className="flex justify-between">
            <span>Total</span>
            <span>{formatCurrency(selectedOffer.price)}</span>
          </div>
          {environment === "sandbox" && (
            <p className="mt-1 text-[11px] text-warning">
              Sandbox mode: use test card 4242 4242 4242 4242, any 3-digit CVV,
              any future expiry.
            </p>
          )}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
      <div id="pe" className="w-full" />
      {!prebookData && (
        <Button
          type="button"
          className="w-full lp-submit-button"
          onClick={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            "Pay now"
          )}
        </Button>
      )}
    </section>
  );
}

export default PaymentStep;

