import React, { useState } from "react";
import useBookingStore from "../../stores/useBookingStore.js";
import Input from "../ui/Input.jsx";
import Button from "../ui/Button.jsx";

function GuestDetailsForm() {
  const { guestDetails, setGuestDetails, setStep } = useBookingStore();
  const [local, setLocal] = useState(guestDetails);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!local.firstName) nextErrors.firstName = "First name is required";
    if (!local.lastName) nextErrors.lastName = "Last name is required";
    if (!local.email) nextErrors.email = "Email is required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(local.email)) {
      nextErrors.email = "Enter a valid email";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setGuestDetails(local);
    setStep("payment");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-4 text-sm"
    >
      <div>
        <h2 className="font-heading text-lg text-primary mb-1">
          Guest details
        </h2>
        <p className="text-xs text-textMedium">
          We&apos;ll use this information to confirm your booking.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Input
            id="firstName"
            label="First name"
            value={local.firstName}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, firstName: e.target.value }))
            }
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-error">{errors.firstName}</p>
          )}
        </div>
        <div>
          <Input
            id="lastName"
            label="Last name"
            value={local.lastName}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, lastName: e.target.value }))
            }
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-error">{errors.lastName}</p>
          )}
        </div>
      </div>
      <div>
        <Input
          id="email"
          type="email"
          label="Email"
          value={local.email}
          onChange={(e) =>
            setLocal((prev) => ({ ...prev, email: e.target.value }))
          }
        />
        {errors.email && (
          <p className="mt-1 text-xs text-error">{errors.email}</p>
        )}
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        Continue to payment
      </Button>
    </form>
  );
}

export default GuestDetailsForm;

