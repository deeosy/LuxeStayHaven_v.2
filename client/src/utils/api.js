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
    children: data?.children ?? 0,
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

export async function finalizeBooking(prebookId, transactionId, environment) {
  try {
    const res = await fetch(`${BASE}/book`, {
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
  const res = await fetch(`${BASE}/book?${params.toString()}`);
  return handleResponse(res);
}
