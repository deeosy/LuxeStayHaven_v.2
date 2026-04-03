export function formatCurrency(amount, currency = "USD") {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(Number(amount));
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const raw = String(dateStr);
  let d;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    d = new Date(year, month, day);
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
