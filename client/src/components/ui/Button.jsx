import React from "react";

function Button({ variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-accent text-white shadow-soft hover:bg-accentAlt",
    secondary:
      "border border-primary/20 bg-white text-primary hover:bg-primary/5",
    ghost: "text-primary hover:bg-primary/5"
  };

  return (
    <button
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;

