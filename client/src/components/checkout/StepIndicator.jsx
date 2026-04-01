import React from "react";
import useBookingStore from "../../stores/useBookingStore.js";

const steps = [
  { id: "details", label: "Guest details" },
  { id: "payment", label: "Payment" },
  { id: "confirmation", label: "Confirmation" }
];

function StepIndicator() {
  const { step } = useBookingStore();
  const currentIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center justify-between text-xs text-textMedium">
      {steps.map((s, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        return (
          <div key={s.id} className="flex-1 flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full border flex items-center justify-center text-[11px] ${
                  isCompleted
                    ? "bg-primary text-white border-primary"
                    : isActive
                    ? "bg-accent text-white border-accent"
                    : "border-slate-300 bg-white text-textLight"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`hidden sm:inline ${
                  isActive || isCompleted ? "text-textDark" : "text-textLight"
                }`}
              >
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-px bg-slate-200 mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;

