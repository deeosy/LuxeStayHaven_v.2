let cachedBase = null;

// This will automatically be http://localhost:5000 during 'npm run dev'
// and https://api.luxestayhaven.com during 'npm run build' (production)
export const API_BASE = import.meta.env.VITE_API_BASE;

// You can now just use it directly in your fetch calls:
// const response = await fetch(`${API_BASE}/hotels`);

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
  placeId,
  latitude,
  longitude,
  radius,
  occupancies,
  starRating,
  refundable,
  boardType,
  offset,
  limit,
  environment
}) {
  const cc = ensureCountryCode(city, countryCode);
  const params = new URLSearchParams();
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  if (typeof adults !== "undefined" && adults !== null) {
    params.set("adults", String(adults));
  }
  if (city) params.set("city", city);
  if (cc) params.set("countryCode", cc);
  if (placeId) params.set("placeId", String(placeId));
  if (latitude) params.set("latitude", String(latitude));
  if (longitude) params.set("longitude", String(longitude));
  if (radius) params.set("radius", String(radius));
  if (occupancies) params.set("occupancies", String(occupancies));
  if (starRating) params.set("starRating", String(starRating));
  if (typeof refundable !== "undefined" && refundable !== null) {
    params.set("refundable", String(refundable));
  }
  if (boardType) params.set("boardType", String(boardType));
  if (typeof offset !== "undefined" && offset !== null) {
    params.set("offset", String(offset));
  }
  if (typeof limit !== "undefined" && limit !== null) {
    params.set("limit", String(limit));
  }
  if (environment) params.set("environment", environment);
  const base = API_BASE;
  const res = await fetch(`${base}/search-hotels?${params.toString()}`);
  return handleResponse(res);
}

export async function placesAutocomplete({ textQuery, type, environment }) {
  const params = new URLSearchParams();
  if (textQuery) params.set("textQuery", textQuery);
  if (type) params.set("type", type);
  if (environment) params.set("environment", environment);
  const res = await fetch(`${API_BASE}/places?${params.toString()}`);   
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
  const base = API_BASE;
  const res = await fetch(`${base}/search-rates?${params.toString()}`);
  return handleResponse(res);
}

export async function prebook(data) {
  const payload = {
    offerId: data?.offerId,
    checkin: data?.checkin,
    checkout: data?.checkout,
    adults: data?.adults,
    hotelId: data?.hotelId,
    children: data?.children ?? 0,
    environment: data?.environment
  };

  // Backward compatibility: some callers still send { rateId }
  if (!payload.offerId && data?.rateId) {
    payload.offerId = data.rateId;
  }

  const res = await fetch(`${API_BASE}/prebook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  // Return the raw JSON response from the backend (full LiteAPI prebook response).
  return handleResponse(res);
}

export function extractPrebookData(prebookResponse) {
  const raw = prebookResponse?.success?.data
    ? prebookResponse.success
    : prebookResponse;

  const data = raw?.data || raw;

  return {
    status: raw?.status,
    prebookId: data?.prebookId,
    transactionId: data?.transactionId,
    secretKey: data?.secretKey
  };
}

export function loadLitePaymentSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.LiteAPIPayment) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-liteapi-payment="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load LiteAPI Payment SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js";
    script.async = true;
    script.setAttribute("data-liteapi-payment", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load LiteAPI Payment SDK"));
    document.body.appendChild(script);
  });
}

export async function initializeLitePayment({
  prebookResponse,
  returnUrl,
  targetElement,
  environment
}) {
  const { prebookId, secretKey } = extractPrebookData(prebookResponse);

  if (!prebookId || !secretKey) {
    throw new Error("Prebook response missing prebookId or secretKey");
  }

  await loadLitePaymentSdk();

  // FIXED: LiteAPI Payment SDK expects sandbox/production keys (do not hardcode ports in returnUrl)
  const publicKey = environment === "sandbox" ? "sandbox" : "production";

  const container = document.querySelector(targetElement);
  if (container) container.innerHTML = "";

  const config = {
    publicKey,
    secretKey,
    targetElement,
    returnUrl,
    environment,
    options: {
      business: { name: "LuxeStayHaven" }
    }
  };

  console.log("LiteAPI Payment init config:", {
    publicKey: config.publicKey,
    targetElement: config.targetElement,
    returnUrl: config.returnUrl,
    environment: config.environment
  });

  const payment = new window.LiteAPIPayment(config);
  payment.handlePayment();
}

export async function prebookOffer({
  offerId,
  checkin,
  checkout,
  adults,
  hotelId,
  environment
}) {
  const base = API_BASE;
  const res = await fetch(`${base}/prebook`, {
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
  const base = API_BASE;
  const res = await fetch(`${base}/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prebookId, transactionId, environment, holder })
  });
  return handleResponse(res);
}

export async function finalizeBooking(prebookId, transactionId, environment) {
  try {
    const base = API_BASE;
    const res = await fetch(`${base}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prebookId, transactionId, environment })
    });
    return handleResponse(res);
  } catch (err) {
    console.error("Finalize booking error:", err);
    throw err;
  }
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
  const res = await fetch(`${API_BASE}/book?${params.toString()}`);
  return handleResponse(res);
}
