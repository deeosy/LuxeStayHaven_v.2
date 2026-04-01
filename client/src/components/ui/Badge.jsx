import React from "react";

function Badge({ children, color = "default", className = "" }) {
  const styles = {
    default: "bg-slate-100 text-textMedium",
    success: "bg-success/10 text-success",
    error: "bg-error/10 text-error",
    info: "bg-primary/10 text-primary"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[color] ?? styles.default} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;

