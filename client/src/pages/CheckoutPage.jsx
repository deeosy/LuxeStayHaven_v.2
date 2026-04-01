import React, { useEffect } from "react";
import useBookingStore from "../stores/useBookingStore.js";
import StepIndicator from "../components/checkout/StepIndicator.jsx";
import GuestDetailsForm from "../components/checkout/GuestDetailsForm.jsx";
import PaymentStep from "../components/checkout/PaymentStep.jsx";
import BookingConfirmation from "../components/checkout/BookingConfirmation.jsx";

function CheckoutPage() {
  const { step, setStep } = useBookingStore();

  useEffect(() => {
    // If we have booking params in URL, we're coming back from a payment redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("prebookId") && params.get("transactionId")) {
      setStep("payment");
    }
  }, [setStep]);

  return (
    <section className="bg-background py-8 sm:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <StepIndicator />
        {step === "details" && <GuestDetailsForm />}
        {step === "payment" && <PaymentStep />}
        {step === "confirmation" && <BookingConfirmation />}
      </div>
    </section>
  );
}

export default CheckoutPage;

