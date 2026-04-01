const BASE = "/api";

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

export async function searchHotels({
  checkin,
  checkout,
  adults,
  city,
  countryCode,
  environment
}) {
  const params = new URLSearchParams({
    checkin,
    checkout,
    adults: String(adults),
    city,
    countryCode,
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

export async function prebook({ rateId, environment, voucherCode }) {
  const res = await fetch(`${BASE}/prebook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rateId, environment, voucherCode })
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

