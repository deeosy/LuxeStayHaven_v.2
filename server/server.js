const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const liteApi = require("liteapi-node-sdk");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Enhanced CORS configuration for payment processing
const corsOptions = {
  origin: [
    "http://localhost:3000",
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

app.get("/search-hotels", async (req, res) => {
  console.log("Search endpoint hit");
  const { checkin, checkout, adults, city, countryCode, environment } = req.query;
  const apiKey = environment == "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

  try {
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
      checkin,
      checkout,
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
  const { rateId, environment, voucherCode } = req.body;
  const apiKey = environment === "sandbox" ? sandbox_apiKey : prod_apiKey;

  const offerId = rateId != null ? String(rateId).trim() : "";
  if (!offerId) {
    return res.status(400).json({ error: "rateId (offerId from rates search) is required" });
  }
  if (!apiKey || String(apiKey).trim() === "") {
    const keyName = environment === "sandbox" ? "SAND_API_KEY" : "PROD_API_KEY";
    return res.status(401).json({ error: `Missing ${keyName} in .env` });
  }

  const sdk = liteApi(apiKey);
  const bodyData = {
    offerId,
    usePaymentSdk: true,
  };
  if (voucherCode != null && String(voucherCode).trim() !== "") {
    bodyData.voucherCode = String(voucherCode).trim();
  }

  try {
    const result = await sdk.preBook(bodyData);

    if (result.status === "failed") {
      const errMsg =
        result.error?.message ||
        (Array.isArray(result.errors) ? result.errors.join(", ") : "Prebook failed");
      const code = result.error?.code;
      console.error("preBook failed:", result);
      const httpStatus =
        typeof code === "number" && code >= 400 && code < 600 ? code : 400;
      return res.status(httpStatus).json({
        error: errMsg,
        code,
        details: result.error || result.errors,
      });
    }

    if (result.status === "success" && result.data) {
      return res.json({ success: result });
    }

    console.error("Unexpected preBook result:", result);
    return res.status(502).json({ error: "Unexpected prebook response from LiteAPI" });
  } catch (err) {
    console.error("preBook exception:", err);
    return res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }
});

app.get("/book", (req, res) => {
  console.log(req.query);
  const { prebookId, guestFirstName, guestLastName, guestEmail, transactionId, environment } =
    req.query;

  const apiKey = environment === "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

	// Prepare the booking data
  const bodyData = {
    holder: {
      firstName: guestFirstName,
      lastName: guestLastName,
      email: guestEmail,
    },
    payment: {
      method: "TRANSACTION_ID",
      transactionId: transactionId,
    },
    prebookId: prebookId,
    guests: [
      {
        occupancyNumber: 1,
        remarks: "",
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
      },
    ],
  };

  console.log(bodyData);

  sdk
    .book(bodyData)
    .then((data) => {
      if (!data || data.error) {
        // Validate if there's any error in the data
        throw new Error(
          "Error in booking data: " + (data.error ? data.error.message : "Unknown error")
        );
      }

      console.log(data);

      res.json({
        success: true,
        data: {
          bookingId: data.data.bookingId,
          hotelConfirmationNumber: data.data.hotelConfirmationNumber || null,
          hotelName: data.data.hotel.name,
          status: data.data.status,
          checkin: data.data.checkin,
          checkout: data.data.checkout,
          roomType: data.data.bookedRooms[0].roomType.name,
          totalAmount: data.data.bookedRooms[0].rate.retailRate.total.amount,
          currency: data.data.bookedRooms[0].rate.retailRate.total.currency,
          guestFirstName: data.data.bookedRooms[0].firstName,
          guestLastName: data.data.bookedRooms[0].lastName,
          guestEmail: data.data.bookedRooms[0].email,
          cancelBy: data.data.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || "Not specified",
          cancelFee: data.data.cancellationPolicies?.cancelPolicyInfos?.[0]?.amount || "Not specified",
          remarks: data.data.remarks || "No additional remarks."
        }
      });
    })
    .catch((err) => {
      console.error("Error during booking:", err);
      res.status(500).send(`Failed to book: ${err.message}`);
    });
});

// Serve the client-side application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

app.use(express.static(path.join(__dirname, "../client")));

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
