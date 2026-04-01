const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const liteApi = require("liteapi-node-sdk");
const cors = require("cors");
const path = require("path");
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

app.use(bodyParser.json());

// Health check endpoint for deployments/monitoring.
app.get("/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV });
});

app.get("/search-hotels", async (req, res) => {
  console.log("Search endpoint hit");
  const { checkin, checkout, adults, city, countryCode, environment } = req.query;
  const apiKey = environment == "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

  const checkinDate = checkin || today.toISOString().split('T')[0];
  const checkoutDate = checkout || new Date(today.getTime() + 1*24*60*60*1000).toISOString().split('T')[0]; // 1 day later  

  try {
    if (!city) {
      return res.status(400).json({ error: "city is required" });
    }

    if (!countryCode) {
      return res.status(400).json({
        error: "countryCode is required (e.g. FR for France, US for USA)"
      });
    }

    if (!apiKey || String(apiKey).trim() === "") {
      const keyName = environment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
      return res.status(401).json({
        error: `Missing ${keyName} in .env. Copy your key from https://dashboard.liteapi.travel/`,
      });
    }

    const hotelsResponse = await sdk.getHotels(countryCode, city, 0, 10);
    const hotelsFail = liteApiFailure(hotelsResponse);
    if (hotelsFail) {
      console.error("getHotels failed:", hotelsFail);
      return sendLiteApiError(res, hotelsFail);
    }

    // Support both latest SDK (returns array) and older one (returns { data: [] })
    const hotels = Array.isArray(hotelsResponse) ? hotelsResponse : hotelsResponse?.data;

    if (!Array.isArray(hotels)) {
      console.error("Unexpected getHotels response shape:", hotelsResponse);
      return res.status(502).json({ error: "Unexpected response from hotel search API" });
    }

    const hotelIds = hotels.map((hotel) => hotel.id);

    const fullRatesResponse = await sdk.getFullRates({
      hotelIds,
      occupancies: [{ adults: parseInt(adults, 10) }],
      currency: "USD",
      guestNationality: "US",
      checkin: checkinDate,
      checkout: checkoutDate,
    });

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

    res.json({ rates });
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
  // Required fields (POST JSON body): offerId, checkin, checkout, adults
  // Optional: hotelId, children
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

  // Step 2: Choose environment + api key (sandbox/production)
  const resolvedEnvironment =
    environment ||
    process.env.LITEAPI_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "sandbox");

  const apiKey =
    resolvedEnvironment === "sandbox" ? sandbox_apiKey : prod_apiKey;

  if (!apiKey || String(apiKey).trim() === "") {
    const keyName =
      resolvedEnvironment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
    return res.status(401).json({ error: `Missing ${keyName} in .env` });
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
    // Do NOT pass margin here (we use the LiteAPI dashboard default)
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
  // Step 1: Accept input from query (GET) or body (POST)
  const source = req.method === "POST" ? req.body : req.query;

  const {
    prebookId,
    transactionId,
    environment,
    holder: holderRaw,
    guestFirstName,
    guestLastName,
    guestEmail,
  } = source || {};

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
  console.log("book request:", {
    prebookId,
    transactionId,
    environment: resolvedEnvironment,
    holderEmail: holder?.email,
  });

  try {
    const hasRatesBook = typeof sdk?.rates?.book === "function";
    const result = hasRatesBook
      ? await sdk.rates.book({ prebookId, transactionId, holder })
      : await sdk.book({
          prebookId,
          transactionId,
          holder,
          payment: { method: "TRANSACTION_ID", transactionId },
        });

    const fail = liteApiFailure(result);
    if (fail) {
      console.error("book failed:", fail);
      return sendLiteApiError(res, fail);
    }

    const bookingData = result?.data || result;
    console.log("book success:", {
      status: result?.status,
      bookingId: bookingData?.bookingId,
    });

    // Step 6: Return booking reference
    return res.json({
      success: true,
      bookingId: bookingData?.bookingId,
      booking: bookingData,
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

// Serve the client-side application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

app.use(express.static(path.join(__dirname, "../client")));

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
