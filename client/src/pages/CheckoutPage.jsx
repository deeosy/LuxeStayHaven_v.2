import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import useBookingStore from "../stores/useBookingStore.js";
import useSearchStore from "../stores/useSearchStore.js";
import StepIndicator from "../components/checkout/StepIndicator.jsx";
import GuestDetailsForm from "../components/checkout/GuestDetailsForm.jsx";
import PaymentStep from "../components/checkout/PaymentStep.jsx";
import Confirmation from "./Confirmation.jsx";

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <StepIndicator />
        {step === "details" && <GuestDetailsForm />}
        {step === "payment" && <PaymentStep />}
        {step === "confirmation" && <Confirmation />}
      </div>
    </section>
  );
}

export default CheckoutPage;
