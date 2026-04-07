const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const liteApi = require("liteapi-node-sdk");
const cors = require("cors");
const path = require("path");
const https = require("https");
require("dotenv").config();
const morgan = require('morgan');

app.use(morgan('dev'));   // This prints nice logs in the terminal when requests come in

// Enhanced CORS configuration for payment processing
const corsOptions = {
  origin: [
    "http://localhost:5000",
    "http://localhost:3001",
    "https://payment-wrapper.liteapi.travel",
    "https://merchant-ui-api.stripe.com",
    "https://r.stripe.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "Authorization",
    "X-API-Key",
    "X-Requested-With",
    "Origin"
  ],
  credentials: true,
  maxAge: 86400,
  preflightContinue: true
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for payment endpoints
app.options("/prebook", cors(corsOptions));
app.options("/book", cors(corsOptions));
app.options("*", cors(corsOptions));

const prod_apiKey = process.env.PROD_API_KEY;
const sandbox_apiKey = process.env.SAND_API_KEY;
const today = new Date();

/** LiteAPI SDK returns errors in multiple formats. This function detects them. */
function liteApiFailure(body) {
  if (!body || typeof body !== "object") return null;
  
  // Format 1: { status: 'failed', error: { code, message } }
  if (body.status === "failed" && body.error) {
    return {
      code: body.error.code ?? 502,
      message: body.error.message || "LiteAPI request failed",
    };
  }
  
  // Format 2: Direct error response { error: "message", code: 4002 }
  if (body.error && body.code) {
    return {
      code: body.code ?? 502,
      message: body.error || "LiteAPI request failed",
    };
  }
  
  // Format 3: { errors: [...] }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return {
      code: 400,
      message: body.errors.join(", "),
    };
  }
  
  return null;
}

function httpStatusFromLiteApiCode(code) {
  if (code === 401) return 401;
  if (code >= 400 && code < 600) return code;
  return 502;
}

function sendLiteApiError(res, failure) {
  return res.status(httpStatusFromLiteApiCode(failure.code)).json({
    error: failure.message,
    code: failure.code,
  });
}

function httpGetJson(url, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "X-Api-Key": apiKey } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 500;
          if (status < 200 || status >= 300) {
            return reject({ status, body });
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject({ status: 502, body });
          }
        });
      }
    );
    req.on("error", (err) => reject({ status: 500, body: err.message }));
    req.end();
  });
}

function parseOccupanciesParam(value) {
  if (!value) return null;
  const raw = String(value);
  try {
    return JSON.parse(raw);
  } catch {}
  try {
    const decoded = decodeURIComponent(raw);
    return JSON.parse(decoded);
  } catch {}
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {}
  return null;
}

function parseBooleanParam(value) {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (s === "") return null;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return null;
}

function parseCsvParam(value) {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  return raw
    .split(",")
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function parseStarRatingsParam(value) {
  const parts = parseCsvParam(value);
  const nums = parts
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 5);
  if (nums.length === 0) return [];
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function hotelStarsValue(hotel) {
  const raw = hotel?.stars ?? hotel?.starRating ?? hotel?.rating ?? null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

app.use(bodyParser.json());

// Health check endpoint for deployments/monitoring.
app.get("/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV });
});

app.get("/places", async (req, res) => {
  const {
    textQuery = "",
    type,
    language = "en",
    ip,
    environment
  } = req.query;
  const apiKey = environment == "sandbox" ? sandbox_apiKey : prod_apiKey;
  if (!apiKey || String(apiKey).trim() === "") {
    const keyName = environment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
    return res.status(401).json({
      error: `Missing ${keyName} in .env. Copy your key from https://dashboard.liteapi.travel/`,
    });
  }
  const q = String(textQuery || "").trim();
  if (q.length < 3) {
    return res.json({ data: [], message: "Type at least 3 characters" });
  }

  const requestedTypes = String(type || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const typeList =
    requestedTypes.length === 0
      ? ["locality"]
      : ["locality", ...requestedTypes.filter((t) => t !== "locality")];

  try {
    const url = new URL("https://api.liteapi.travel/v3.0/data/places");
    url.searchParams.set("textQuery", q);
    url.searchParams.set("type", typeList.join(","));
    if (language) url.searchParams.set("language", language);
    const forwardedFor = String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim();
    const remote = String(req.socket?.remoteAddress || "").trim();
    const inferredIpRaw = forwardedFor || remote;
    const inferredIp = inferredIpRaw.startsWith("::ffff:")
      ? inferredIpRaw.slice(7)
      : inferredIpRaw;
    const ipToUse = String(ip || inferredIp || "").trim();
    if (ipToUse && ipToUse !== "::1" && ipToUse.includes(".")) {
      url.searchParams.set("ip", ipToUse);
    }
    const json = await httpGetJson(url.toString(), apiKey);
    const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    return res.json({ data, message: "ok" });
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({
      error: status === 429 ? "Rate limited" : "Failed to load places",
    });
  }
});

app.get("/search-hotels", async (req, res) => {
  console.log("Search endpoint hit");
  const {
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
    environment,
    starRating,
    refundable,
    boardType,
    offset,
    limit
  } = req.query;
  const apiKey = environment == "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

  const checkinDate = checkin || today.toISOString().split('T')[0];
  const checkoutDate = checkout || new Date(today.getTime() + 1*24*60*60*1000).toISOString().split('T')[0]; // 1 day later  

  try {

    if (!apiKey || String(apiKey).trim() === "") {
      const keyName = environment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
      return res.status(401).json({
        error: `Missing ${keyName} in .env. Copy your key from https://dashboard.liteapi.travel/`,
      });
    }

    let hotels = [];
    const offsetN = Math.max(0, parseInt(offset, 10) || 0);
    const limitN = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));
    if (placeId) {
      const url = new URL("https://api.liteapi.travel/v3.0/data/hotels");
      url.searchParams.set("placeId", String(placeId));
      url.searchParams.set("limit", String(limitN));
      url.searchParams.set("offset", String(offsetN));
      const data = await httpGetJson(url.toString(), apiKey);
      hotels = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    } else if (latitude && longitude) {
      const url = new URL("https://api.liteapi.travel/v3.0/data/hotels");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("radius", String(radius || 3000));
      url.searchParams.set("limit", String(limitN));
      url.searchParams.set("offset", String(offsetN));
      const data = await httpGetJson(url.toString(), apiKey);
      hotels = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    } else {
      if (!city) {
        return res.status(400).json({ error: "city is required" });
      }
      if (!countryCode) {
        return res.status(400).json({
          error: "countryCode is required (e.g. FR for France, US for USA)"
        });
      }
      const hotelsResponse = await sdk.getHotels(countryCode, city, offsetN, limitN);
      const hotelsFail = liteApiFailure(hotelsResponse);
      if (hotelsFail) {
        console.error("getHotels failed:", hotelsFail);
        return sendLiteApiError(res, hotelsFail);
      }
      hotels = Array.isArray(hotelsResponse) ? hotelsResponse : hotelsResponse?.data;
      if (!Array.isArray(hotels)) {
        console.error("Unexpected getHotels response shape:", hotelsResponse);
        return res.status(502).json({ error: "Unexpected response from hotel search API" });
      }
    }

    const starRatings = parseStarRatingsParam(starRating);
    const refundableOnly = parseBooleanParam(refundable);
    const boardTypes = parseCsvParam(boardType).map((b) => b.toUpperCase());
    const minStar = starRatings.length > 0 ? Math.min(...starRatings) : null;

    if (minStar != null) {
      hotels = hotels.filter((h) => {
        const stars = hotelStarsValue(h);
        if (stars == null) return false;
        return stars >= minStar;
      });
    }

    const hotelIds = hotels.map((hotel) => hotel.id);
    if (hotelIds.length === 0) {
      return res.json({ rates: [], nextOffset: offsetN, hasMore: false });
    }
    const parsedOccupancies = parseOccupanciesParam(occupancies);
    const occupanciesArray = Array.isArray(parsedOccupancies)
      ? parsedOccupancies
          .map((o) => ({ adults: parseInt(o?.adults ?? 2, 10) || 2 }))
          .slice(0, 6)
      : [{ adults: parseInt(adults, 10) || 2 }];

    const ratesRequest = {
      hotelIds,
      occupancies: occupanciesArray,
      currency: "USD",
      guestNationality: "US",
      checkin: checkinDate,
      checkout: checkoutDate,
    };

    // Backend-supported filters (when LiteAPI supports them). We still apply a server-side
    // fallback filter after the response to guarantee correct behavior even if the SDK
    // ignores unknown fields.
    if (starRatings.length > 0) ratesRequest.starRating = starRatings;
    if (typeof refundableOnly === "boolean") ratesRequest.refundable = refundableOnly;
    if (boardTypes.length > 0) ratesRequest.boardType = boardTypes;

    console.log("Rates search filters:", {
      starRating: starRatings.length > 0 ? starRatings : null,
      refundable: typeof refundableOnly === "boolean" ? refundableOnly : null,
      boardType: boardTypes.length > 0 ? boardTypes : null
    });

    const fullRatesResponse = await sdk.getFullRates(ratesRequest);

    const ratesFail = liteApiFailure(fullRatesResponse);
    if (ratesFail) {
      console.error("getFullRates failed:", ratesFail);
      return sendLiteApiError(res, ratesFail);
    }

    // Handle different SDK response structures
    let rates = Array.isArray(fullRatesResponse)
      ? fullRatesResponse
      : fullRatesResponse?.data;

    if (!Array.isArray(rates)) {
      console.error("Unexpected getFullRates response shape:", JSON.stringify(fullRatesResponse, null, 2));
      return res.status(502).json({ error: "Unexpected response from rates API" });
    }

    rates.forEach((rate) => {
      rate.hotel = hotels.find((hotel) => hotel.id === rate.hotelId);
    });

    if (boardTypes.length > 0 || refundableOnly === true) {
      rates = rates
        .map((rate) => {
          const roomTypes = Array.isArray(rate?.roomTypes) ? rate.roomTypes : [];
          const nextRoomTypes = roomTypes
            .map((rt) => {
              const offers = Array.isArray(rt?.rates) ? rt.rates : [];
              const filteredOffers = offers.filter((o) => {
                if (refundableOnly === true && o?.cancellationPolicies?.refundableTag !== "RFN") {
                  return false;
                }
                if (boardTypes.length > 0) {
                  const bt = String(o?.boardType || "").toUpperCase();
                  if (!boardTypes.includes(bt)) return false;
                }
                return true;
              });
              if (filteredOffers.length === 0) return null;
              return { ...rt, rates: filteredOffers };
            })
            .filter(Boolean);
          if (nextRoomTypes.length === 0) return null;
          return { ...rate, roomTypes: nextRoomTypes };
        })
        .filter(Boolean);
    }

    res.json({ rates, nextOffset: offsetN + hotels.length, hasMore: hotels.length === limitN });
  } catch (error) {
    console.error("Error searching for hotels:", error?.response?.data || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/search-rates", async (req, res) => {
  console.log("Rate endpoint hit");
  const { checkin, checkout, adults, hotelId, environment } = req.query;
  const apiKey = environment === "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

  try {
    if (!apiKey || String(apiKey).trim() === "") {
      const keyName = environment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
      return res.status(401).json({
        error: `Missing ${keyName} in .env. Copy your key from https://dashboard.liteapi.travel/`,
      });
    }

    // Fetch rates only for the specified hotel
    const fullRatesResponse = await sdk.getFullRates({
      hotelIds: [hotelId],
      occupancies: [{ adults: parseInt(adults, 10) }],
      currency: "USD",
      guestNationality: "US",
      checkin,
      checkout,
    });

    // Log full response for debugging
    console.log("Full Rates Response Type:", typeof fullRatesResponse);
    console.log("Full Rates Response Keys:", Object.keys(fullRatesResponse || {}));
    console.log("Full Rates Response:", JSON.stringify(fullRatesResponse, null, 2));

    const ratesFail = liteApiFailure(fullRatesResponse);
    if (ratesFail) {
      console.error("getFullRates failed (search-rates):", ratesFail);
      return sendLiteApiError(res, ratesFail);
    }

    // Check for success status
    if (fullRatesResponse?.status === "success") {
      // Get rates from data field, default to empty array if no data
      const rates = fullRatesResponse?.data || [];
      
      // No rates available for this hotel
      if (!Array.isArray(rates) || rates.length === 0) {
        console.warn("No rates found for hotel:", hotelId);
        return res.json({ hotelInfo: {}, rateInfo: [] });
      }

      // Fetch hotel details
      const hotelsResponse = await sdk.getHotelDetails(hotelId);
      const detailsFail = liteApiFailure(hotelsResponse);
      if (detailsFail) {
        console.error("getHotelDetails failed:", detailsFail);
        return sendLiteApiError(res, detailsFail);
      }
      const hotelInfo = hotelsResponse.data;

      // Prepare the response data
      const rateInfo = rates.map((hotel) =>
        hotel.roomTypes.flatMap((roomType) => {
          // Define the board types we're interested in
          const boardTypes = ["RO", "BI"];

          // Filter rates by board type and sort by refundable tag
          return boardTypes
            .map((boardType) => {
              const filteredRates = roomType.rates.filter((rate) => rate.boardType === boardType);

              // Sort to prioritize 'RFN' over 'NRFN'
              const sortedRates = filteredRates.sort((a, b) => {
                if (
                  a.cancellationPolicies.refundableTag === "RFN" &&
                  b.cancellationPolicies.refundableTag !== "RFN"
                ) {
                  return -1; // a before b
                } else if (
                  b.cancellationPolicies.refundableTag === "RFN" &&
                  a.cancellationPolicies.refundableTag !== "RFN"
                ) {
                  return 1; // b before a
                }
                return 0; // no change in order
              });

              // Return the first rate meeting the criteria if it exists
              if (sortedRates.length > 0) {
                const rate = sortedRates[0];
                return {
                  rateName: rate.name,
                  offerId: roomType.offerId,
                  board: rate.boardName,
                  refundableTag: rate.cancellationPolicies.refundableTag,
                  retailRate: rate.retailRate.total[0].amount,
                  originalRate: rate.retailRate.suggestedSellingPrice[0].amount,
                };
              }
              return null; // or some default object if no rates meet the criteria
            })
            .filter((rate) => rate !== null); // Filter out null values if no rates meet the criteria
        })
      );
      return res.json({ hotelInfo, rateInfo });
    }

    // If status is not "success", return error
    console.error("getFullRates unexpected status:", fullRatesResponse?.status);
    return res.status(502).json({ error: "No availability found for the selected dates and hotel" });
  } catch (error) {
    console.error("Error fetching rates:", error);
    res.status(500).json({ error: "No availability found" });
  }
});

app.post("/prebook", async (req, res) => {
  // Required fields: offerId, checkin, checkout, adults
  // Optional fields: hotelId, children (defaults to 0)
  const {
    offerId: offerIdRaw,
    checkin,
    checkout,
    adults,
    hotelId,
    children = 0,
    environment
  } = req.body || {};

  const offerId = offerIdRaw != null ? String(offerIdRaw).trim() : "";
  const adultsNum = adults != null ? Number(adults) : NaN;
  const childrenNum = children != null ? Number(children) : 0;

  if (!offerId || !checkin || !checkout || !adultsNum) {
    return res.status(400).json({
      error: "Missing required field(s): offerId, checkin, checkout, adults"
    });
  }

  const resolvedEnvironment =
    environment ||
    process.env.LITEAPI_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox");

  const apiKey =
    resolvedEnvironment === "sandbox" ? sandbox_apiKey : prod_apiKey;

  if (!apiKey || String(apiKey).trim() === "") {
    const keyName =
      resolvedEnvironment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
    return res.status(401).json({
      error: `Missing ${keyName} in .env. Copy your key from https://dashboard.liteapi.travel/`
    });
  }

  console.log("Prebook called with offerId:", offerId);
  console.log("prebook request:", {
    offerId,
    checkin,
    checkout,
    adults: adultsNum,
    children: childrenNum,
    hotelId,
    environment: resolvedEnvironment
  });

  const sdk = liteApi(apiKey);

  try {
    const prebookResponse = await sdk.preBook({
      offerId,
      usePaymentSdk: true
    });

    const fail = liteApiFailure(prebookResponse);
    if (fail) {
      console.error("preBook failed:", fail);
      return sendLiteApiError(res, fail);
    }

    return res.json(prebookResponse);
  } catch (error) {
    console.error("preBook exception:", error?.response?.data || error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function handleBook(req, res) {
  // Step 1: Accept input from POST body and query params (query as fallback)
  const source = { ...(req.body || {}), ...(req.query || {}) };

  const {
    prebookId,
    transactionId,
    environment,
    holder: holderRaw,
    guestFirstName,
    guestLastName,
    guestEmail,
  } = source;

  // Step 2: Validate required fields
  const missing = [];
  if (!prebookId) missing.push("prebookId");
  if (!transactionId) missing.push("transactionId");
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required field(s): ${missing.join(", ")}`,
    });
  }

  // Step 3: Choose environment + api key (sandbox/production)
  const resolvedEnvironment =
    environment ||
    process.env.LITEAPI_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox");
  const apiKey =
    resolvedEnvironment === "sandbox" ? sandbox_apiKey : prod_apiKey;

  if (!apiKey || String(apiKey).trim() === "") {
    const keyName = resolvedEnvironment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
    return res.status(401).json({ error: `Missing ${keyName} in .env` });
  }

  const sdk = liteApi(apiKey);

  // Step 4: Build a safe default holder for testing
  const defaultHolder = {
    title: "Mr",
    firstName: "John",
    lastName: "Doe",
    phone: "+10000000000",
    email: "john.doe@example.com",
  };

  let holder = defaultHolder;
  if (holderRaw) {
    try {
      holder = typeof holderRaw === "string" ? JSON.parse(holderRaw) : holderRaw;
    } catch (e) {
      return res.status(400).json({ error: "Invalid holder JSON" });
    }
  } else if (guestFirstName || guestLastName || guestEmail) {
    holder = {
      ...defaultHolder,
      firstName: guestFirstName || defaultHolder.firstName,
      lastName: guestLastName || defaultHolder.lastName,
      email: guestEmail || defaultHolder.email,
    };
  }

  // Step 5: Call LiteAPI booking endpoint
  console.log(
    "Final /book called with prebookId:",
    prebookId,
    "transactionId:",
    transactionId
  );
  console.log("book request:", {
    prebookId,
    transactionId,
    environment: resolvedEnvironment,
    holderEmail: holder?.email,
  });

  try {
    const hasRatesBook = typeof sdk?.rates?.book === "function";
    // LiteAPI booking flow (Payment SDK):
    // Use payment.method = TRANSACTION_ID and payment.transactionId from the PREBOOK step (tr_ct_...).
    const payload = {
      prebookId,
      holder,
      payment: {
        method: "TRANSACTION_ID",
        transactionId
      },
      guests: [
        {
          occupancyNumber: 1,
          firstName: holder.firstName,
          lastName: holder.lastName,
          email: holder.email,
        },
      ],
    };

    const result = hasRatesBook ? await sdk.rates.book(payload) : await sdk.book(payload);

    const fail = liteApiFailure(result);
    if (fail) {
      console.error("book failed:", fail);
      return sendLiteApiError(res, fail);
    }

    console.log("book success:", {
      status: result?.status,
      bookingId: result?.data?.bookingId,
    });

    // Step 6: Return full booking object
    return res.json({
      success: true,
      booking: result,
      message: "Booking confirmed"
    });
  } catch (error) {
    console.error("book exception:", error?.response?.data || error);
    return res.status(500).json({
      success: false,
      error: error.message || "Booking failed",
    });
  }
}

// Booking confirmation endpoint (GET kept for compatibility; POST recommended for integrations)
app.get("/book", handleBook);
app.post("/book", handleBook);

app.get("/sitemap.xml", (req, res) => {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || "https";
  const host = req.get("host") || "example.com";
  const origin = `${proto}://${host}`;

  const now = new Date();
  const lastmod = now.toISOString();

  const entries = [
    { loc: `${origin}/`, changefreq: "weekly" },
    { loc: `${origin}/search`, changefreq: "daily" },
    { loc: `${origin}/destinations/paris`, changefreq: "weekly" },
    { loc: `${origin}/destinations/dubai`, changefreq: "weekly" },
    { loc: `${origin}/destinations/new-york`, changefreq: "weekly" },
    { loc: `${origin}/destinations/rome`, changefreq: "weekly" },
    { loc: `${origin}/destinations/bali`, changefreq: "weekly" },
    { loc: `${origin}/destinations/tokyo`, changefreq: "weekly" },
    { loc: `${origin}/destinations/london`, changefreq: "weekly" }
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <!-- Hotel detail pages are highly dynamic. Expand this sitemap with popular /hotel/:id URLs when you have a stable list. -->\n` +
    entries
      .map(({ loc, changefreq }) => {
        return (
          `  <url>\n` +
          `    <loc>${loc}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>${changefreq}</changefreq>\n` +
          `  </url>`
        );
      })
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(xml);
});

app.use(express.static(path.join(__dirname, "../client/public")));
app.use(express.static(path.join(__dirname, "../client")));

// Serve the client-side application (SPA fallback for clean routes like /destinations/paris).
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const basePort = Number(process.env.PORT || 5000);

function startServer(port, attempt) {
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE" && attempt < 10) {
      const next = port + 1;
      console.log(`Port ${port} is in use, trying ${next}...`);
      startServer(next, attempt + 1);
      return;
    }
    console.error("Server failed to start:", err);
    process.exit(1);
  });
}

startServer(basePort, 0);
