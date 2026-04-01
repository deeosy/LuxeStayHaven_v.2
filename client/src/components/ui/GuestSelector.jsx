import React from "react";
import Button from "./Button.jsx";

function GuestSelector({ value, onChange }) {
  const increment = () => {
    if (value < 6) onChange(value + 1);
  };
  const decrement = () => {
    if (value > 1) onChange(value - 1);
  };

  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-textMedium">
        Guests
      </span>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="text-sm text-textDark">
          {value} {value === 1 ? "adult" : "adults"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={decrement}
            className="h-7 w-7 rounded-full px-0 text-base leading-none"
          >
            −
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={increment}
            className="h-7 w-7 rounded-full px-0 text-base leading-none"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GuestSelector;

