import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import useBookingStore from "../stores/useBookingStore.js";
import useSearchStore from "../stores/useSearchStore.js";
import StepIndicator from "../components/checkout/StepIndicator.jsx";
import GuestDetailsForm from "../components/checkout/GuestDetailsForm.jsx";
import PaymentStep from "../components/checkout/PaymentStep.jsx";
import Confirmation from "./Confirmation.jsx";
import Badge from "../components/ui/Badge.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";

function BookingSummary({ mode = "default" }) {
  // Checkout summary panel reused across Guest Details and Payment steps.
  const { selectedHotel, selectedOffer } = useBookingStore();
  const { checkin, checkout, adults } = useSearchStore();

  const hotelName = selectedHotel?.hotelName || selectedHotel?.name || "Selected hotel";
  const dates =
    checkin && checkout ? `${formatDate(checkin)} – ${formatDate(checkout)}` : "—";

  const roomName = selectedOffer?.rateName || selectedOffer?.roomType || "—";
  const board = selectedOffer?.board || selectedOffer?.boardName || "";
  const refundableTag = selectedOffer?.refundableTag;
  const total = selectedOffer?.retailRate ?? selectedOffer?.price ?? null;

  return (
    <aside className="rounded-2xl  bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 text-sm lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-textLight">
            Booking summary
          </div>
          <div className="font-heading text-lg text-primary">{hotelName}</div>
        </div>
        {mode === "payment" && <Badge color="success">Secure payment</Badge>}
      </div>

      <div className="rounded-xl bg-background border border-slate-100 p-3 space-y-2">
        <div className="flex justify-between text-xs text-textMedium">
          <span>Dates</span>
          <span className="font-medium text-textDark">{dates}</span>
        </div>
        <div className="flex justify-between text-xs text-textMedium">
          <span>Guests</span>
          <span className="font-medium text-textDark">
            {adults} guest{adults > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-textLight">
          Room
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-2">
          <div className="font-medium text-textDark">{roomName}</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {board && <Badge color="info">{board}</Badge>}
            {refundableTag ? (
              refundableTag === "RFN" ? (
                <Badge color="success">Refundable</Badge>
              ) : (
                <Badge color="error">Non-refundable</Badge>
              )
            ) : null}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-xs text-textMedium">Total</div>
            <div className="text-lg font-semibold text-primary">
              {total != null ? formatCurrency(total) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-textLight">
        Prices and availability are secured during payment.
      </div>
    </aside>
  );
}

function CheckoutPage() {
  const location = useLocation();
  const { step, setStep, selectedOffer, setSelectedOffer } = useBookingStore();
  const { setDates, setAdults, setEnvironment } = useSearchStore();

  useEffect(() => {
    // Checkout routing:
    // - /checkout with offerId/hotelId + search params starts at guest details
    // - /checkout with prebookId + transactionId is a payment redirect, go to confirmation step
    const params = new URLSearchParams(location.search);

    const prebookId = params.get("prebookId");
    const transactionId =
      params.get("transactionId") ||
      params.get("transactionID") ||
      params.get("transaction_id") ||
      params.get("payment_intent");

    if (prebookId && transactionId) {
      setStep("confirmation");
      return;
    }

    const offerId = params.get("offerId");
    const hotelId = params.get("hotelId");
    const checkin = params.get("checkin");
    const checkout = params.get("checkout");
    const adults = params.get("adults");
    const environment = params.get("environment");

    if (!selectedOffer && offerId) {
      setSelectedOffer({ offerId, hotelId });
    }
    if (checkin && checkout) {
      setDates({ checkin, checkout });
    }
    if (adults) {
      setAdults(Number(adults) || 2);
    }
    if (environment) {
      setEnvironment(environment);
    }
  }, [
    location.search,
    selectedOffer,
    setAdults,
    setDates,
    setEnvironment,
    setSelectedOffer,
    setStep
  ]);

  return (
    <section className="bg-background py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <StepIndicator />
        {step === "confirmation" ? (
          <Confirmation />
        ) : (
          // Two-column layout on large screens: step content left, booking summary right.
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
            <div className="min-w-0">
              {step === "details" && <GuestDetailsForm />}
              {step === "payment" && <PaymentStep />}
            </div>
            <div className="lg:block">
              <BookingSummary mode={step === "payment" ? "payment" : "default"} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CheckoutPage;
