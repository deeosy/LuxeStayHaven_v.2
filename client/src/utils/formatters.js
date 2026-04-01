export function formatCurrency(amount, currency = "USD") {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(Number(amount));
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

