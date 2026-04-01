const BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "http://localhost:5000" : window.location.origin);

function ensureCountryCode(city, countryCode) {
  if (countryCode && typeof countryCode === "string") return countryCode.toUpperCase();
  if (!city) return countryCode || "";
  const c = String(city).toLowerCase();
  if (c.includes("paris")) return "FR";
  if (c.includes("london")) return "GB";
  if (c.includes("new york") || c.includes("nyc")) return "US";
  if (c.includes("tokyo")) return "JP";
  if (c.includes("dubai")) return "AE";
  if (c.includes("bali")) return "ID";
  return countryCode || "";
}

async function handleResponse(res) {
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Request failed");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Expected JSON but received: ${String(text).slice(0, 80)}`
    );
  }
}

export async function searchHotels({
  checkin,
  checkout,
  adults,
  city,
  countryCode,
  environment
}) {
  const cc = ensureCountryCode(city, countryCode);
  const params = new URLSearchParams({
    checkin,
    checkout,
    adults: String(adults),
    city,
    countryCode: cc,
    environment
  });
  const res = await fetch(`${BASE}/search-hotels?${params.toString()}`);
  return handleResponse(res);
}

export async function searchRates({
  checkin,
  checkout,
  adults,
  hotelId,
  environment
}) {
  const params = new URLSearchParams({
    checkin,
    checkout,
    adults: String(adults),
    hotelId,
    environment
  });
  const res = await fetch(`${BASE}/search-rates?${params.toString()}`);
  return handleResponse(res);
}

export async function prebook(data) {
  const payload = {
    offerId: data?.offerId,
    checkin: data?.checkin,
    checkout: data?.checkout,
    adults: data?.adults,
    hotelId: data?.hotelId,
    children: data?.children,
    environment: data?.environment
  };

  // Backward compatibility: some callers still send { rateId }
  if (!payload.offerId && data?.rateId) {
    payload.offerId = data.rateId;
  }

  const res = await fetch(`${BASE}/prebook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function prebookOffer({
  offerId,
  checkin,
  checkout,
  adults,
  hotelId,
  environment
}) {
  const res = await fetch(`${BASE}/prebook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offerId,
      checkin,
      checkout,
      adults,
      hotelId,
      environment
    })
  });
  return handleResponse(res);
}

export async function bookReservation({
  prebookId,
  transactionId,
  environment,
  holder
}) {
  const res = await fetch(`${BASE}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prebookId, transactionId, environment, holder })
  });
  return handleResponse(res);
}

export async function completeBooking({
  prebookId,
  transactionId,
  firstName,
  lastName,
  email,
  environment
}) {
  const params = new URLSearchParams({
    prebookId,
    transactionId,
    guestFirstName: firstName,
    guestLastName: lastName,
    guestEmail: email,
    environment
  });
  const res = await fetch(`${BASE}/book?${params.toString()}`);
  return handleResponse(res);
}
