import React from "react";

function Input({ label, id, className = "", type = "text", ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-textMedium"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-textDark placeholder:text-textLight shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 ${className}`}
        {...props}
      />
    </div>
  );
}

export default Input;

