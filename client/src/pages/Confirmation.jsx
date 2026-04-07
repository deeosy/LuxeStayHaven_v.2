import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useSearchStore from "../stores/useSearchStore.js";
import Button from "../components/ui/Button.jsx";
import { finalizeBooking } from "../utils/api.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { trackOnce } from "../utils/analytics.js";

function normalizeTransactionId(searchParams) {
  return (
    searchParams.get("transactionId") ||
    searchParams.get("transactionID") ||
    searchParams.get("transaction_id") ||
    searchParams.get("payment_intent") || 
    ""
  );
}

function pickBookingDetails(payload) {
  const bookingWrapper = payload?.booking || payload?.data || payload;
  const bookingData = bookingWrapper?.data || bookingWrapper;

  const bookingId =
    bookingData?.bookingId ||
    bookingData?.bookingID ||
    bookingData?.reference ||
    bookingData?.id ||
    payload?.bookingId ||
    "";

  const hotelName =
    bookingData?.hotel?.name ||
    bookingData?.hotelName ||
    bookingData?.hotel?.hotelName ||
    "";

  const checkin = bookingData?.checkin || bookingData?.dates?.checkin || "";
  const checkout = bookingData?.checkout || bookingData?.dates?.checkout || "";

  const roomType =
    bookingData?.bookedRooms?.[0]?.roomType?.name || bookingData?.roomType || "";

  const amount =
    bookingData?.bookedRooms?.[0]?.rate?.retailRate?.total?.amount ||
    bookingData?.bookedRooms?.[0]?.rate?.retailRate?.total?.[0]?.amount ||
    bookingData?.totalAmount ||
    bookingData?.price?.gross ||
    bookingData?.price?.amount ||
    null;

  const currency =
    bookingData?.bookedRooms?.[0]?.rate?.retailRate?.total?.currency ||
    bookingData?.bookedRooms?.[0]?.rate?.retailRate?.total?.[0]?.currency ||
    bookingData?.price?.currency ||
    bookingData?.currency ||
    "";

  const guestName =
    bookingData?.holder?.firstName || bookingData?.holder?.lastName
      ? `${bookingData?.holder?.firstName || ""} ${
          bookingData?.holder?.lastName || ""
        }`.trim()
      : "";

  const hotelConfirmationNumber =
    bookingData?.hotelConfirmationNumber ||
    bookingData?.supplierBookingName ||
    "";

  const guestsSummary = (() => {
    const room = bookingData?.bookedRooms?.[0];
    const adults = room?.adults;
    const children = room?.children;
    if (typeof adults === "number" && typeof children === "number") {
      return `${adults} adult${adults === 1 ? "" : "s"}, ${children} child${
        children === 1 ? "" : "ren"
      }`;
    }
    if (typeof adults === "number") return `${adults} adult${adults === 1 ? "" : "s"}`;
    return "";
  })();

  const status = bookingData?.status || bookingData?.bookingStatus || "";

  const board =
    bookingData?.bookedRooms?.[0]?.rate?.boardName ||
    bookingData?.bookedRooms?.[0]?.rate?.board ||
    bookingData?.bookedRooms?.[0]?.rate?.boardType ||
    "";

  const refundableTag =
    bookingData?.bookedRooms?.[0]?.rate?.cancellationPolicies?.refundableTag ||
    bookingData?.cancellationPolicies?.refundableTag ||
    "";

  const cancelPolicyInfos =
    bookingData?.bookedRooms?.[0]?.rate?.cancellationPolicies?.cancelPolicyInfos ||
    bookingData?.cancellationPolicies?.cancelPolicyInfos ||
    [];

  return {
    bookingId,
    hotelName,
    checkin,
    checkout,
    roomType,
    board,
    amount,
    currency,
    guestName,
    guestsSummary,
    hotelConfirmationNumber,
    status,
    refundableTag,
    cancelPolicyInfos,
    bookingData,
    bookingWrapper
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatGuestsInline(bookingData, fallback) {
  const room = bookingData?.bookedRooms?.[0];
  const adults = room?.adults;
  const children = room?.children;
  const parts = [];
  if (Number.isFinite(Number(adults))) {
    const n = Number(adults);
    parts.push(`${n} adult${n === 1 ? "" : "s"}`);
  }
  if (Number.isFinite(Number(children))) {
    const n = Number(children);
    parts.push(`${n} child${n === 1 ? "" : "ren"}`);
  }
  if (parts.length > 0) return parts.join(" · ");
  return fallback || "—";
}

function pickFreeCancellationDeadline(cancelPolicyInfos) {
  const infos = Array.isArray(cancelPolicyInfos) ? cancelPolicyInfos : [];
  let best = null;
  for (const info of infos) {
    const amountRaw = info?.amount ?? info?.feeAmount ?? info?.cancelAmount ?? null;
    const amount = amountRaw == null ? null : Number(amountRaw);
    const type = String(info?.type || info?.cancelType || "").toLowerCase();
    const looksFree =
      (amount != null && Number.isFinite(amount) && amount === 0) ||
      type.includes("free") ||
      type.includes("no_fee");

    if (!looksFree) continue;

    const candidates = [
      info?.cancelTime,
      info?.deadline,
      info?.from,
      info?.dateTime,
      info?.until,
      info?.time
    ].filter(Boolean);

    for (const c of candidates) {
      const s = String(c);
      const d = new Date(s);
      const epoch = d.getTime();
      if (Number.isNaN(epoch)) continue;
      if (!best || epoch > best.epoch) best = { epoch, raw: s };
    }
  }

  return best?.raw || "";
}

function Confirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { environment: defaultEnvironment } = useSearchStore();

  const prebookId = searchParams.get("prebookId") || "";
  const transactionId =
    searchParams.get("transactionId") || searchParams.get("payment_intent") || normalizeTransactionId(searchParams);
  const environment =
    searchParams.get("environment") || defaultEnvironment || "sandbox";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingPayload, setBookingPayload] = useState(null);
  const finalizeInFlight = useRef(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const details = useMemo(
    () => pickBookingDetails(bookingPayload),
    [bookingPayload]
  );

  const handleDownloadConfirmation = useCallback(() => {
    const title = "LuxeStayHaven Booking Confirmation";
    const safeBookingId = (details.bookingId || prebookId || "confirmation")
      .replace(/[^a-z0-9-_]/gi, "_")
      .slice(0, 48);

    const checkinLabel = details.checkin ? formatDate(details.checkin) : "—";
    const checkoutLabel = details.checkout ? formatDate(details.checkout) : "—";
    const guestsLabel = formatGuestsInline(details.bookingData, details.guestsSummary || details.guestName);
    const totalLabel =
      details.amount != null
        ? formatCurrency(details.amount, details.currency || "USD")
        : "—";
    const cancelDeadline = pickFreeCancellationDeadline(details.cancelPolicyInfos);
    const cancelLabel = cancelDeadline
      ? `Free cancellation until ${cancelDeadline}`
      : details.refundableTag === "RFN"
      ? "Refundable"
      : details.refundableTag
      ? `Refundable tag: ${details.refundableTag}`
      : "—";

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root{
      --bg:#ffffff;
      --ink:#0f172a;
      --muted:#475569;
      --border:#e2e8f0;
      --accent:#b38a4c;
      --soft:#f8fafc;
    }
    *{box-sizing:border-box;}
    body{
      font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
      margin:0;
      color:var(--ink);
      background:var(--bg);
    }
    .page{
      max-width:900px;
      margin:40px auto;
      padding:0 24px 48px;
    }
    .topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      padding:20px 0 18px;
      border-bottom:1px solid var(--border);
    }
    .brand{
      display:flex;
      align-items:baseline;
      gap:10px;
    }
    .logo{
      font-size:18px;
      letter-spacing:.08em;
      font-weight:700;
    }
    .logo span{color:var(--accent);}
    .tag{
      font-size:11px;
      letter-spacing:.2em;
      text-transform:uppercase;
      color:var(--muted);
    }
    h1{
      margin:28px 0 8px;
      font-size:28px;
      letter-spacing:-.02em;
    }
    .subtitle{
      color:var(--muted);
      font-size:13px;
      margin:0 0 18px;
      line-height:1.6;
    }
    .grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:14px;
    }
    .card{
      border:1px solid var(--border);
      border-radius:18px;
      padding:18px;
      background:var(--bg);
    }
    .card.soft{background:var(--soft);}
    .label{
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.14em;
      color:var(--muted);
      margin-bottom:6px;
    }
    .value{
      font-size:14px;
      font-weight:600;
      line-height:1.35;
      word-break:break-word;
    }
    .pill{
      display:inline-flex;
      align-items:center;
      gap:8px;
      border:1px solid var(--border);
      border-radius:999px;
      padding:8px 12px;
      font-size:12px;
      color:var(--muted);
      background:var(--bg);
    }
    .pill b{color:var(--ink);}
    .section{
      margin-top:18px;
    }
    .footer{
      margin-top:18px;
      padding-top:16px;
      border-top:1px solid var(--border);
      color:var(--muted);
      font-size:12px;
      line-height:1.6;
    }
    @media print{
      .page{margin:0; padding:0 18mm 18mm;}
      .topbar{padding-top:0;}
      body{background:#fff;}
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="topbar">
      <div class="brand">
        <div class="logo">LuxeStay<span>Haven</span></div>
        <div class="tag">Booking confirmation</div>
      </div>
      <div class="pill"><b>Status:</b> ${escapeHtml(details.status || "CONFIRMED")}</div>
    </div>

    <h1>Booking Confirmation</h1>
    <p class="subtitle">
      Thank you for booking with LuxeStayHaven. This document is your booking confirmation and can be printed for your records.
    </p>

    <div class="grid">
      <div class="card soft">
        <div class="label">Booking Reference</div>
        <div class="value">${escapeHtml(details.bookingId || prebookId || "—")}</div>
      </div>
      <div class="card soft">
        <div class="label">Hotel Confirmation Code</div>
        <div class="value">${escapeHtml(details.hotelConfirmationNumber || "—")}</div>
      </div>
      <div class="card">
        <div class="label">Hotel</div>
        <div class="value">${escapeHtml(details.hotelName || "—")}</div>
      </div>
      <div class="card">
        <div class="label">Room Type + Board</div>
        <div class="value">${escapeHtml([details.roomType, details.board].filter(Boolean).join(" · ") || "—")}</div>
      </div>
      <div class="card">
        <div class="label">Check-in</div>
        <div class="value">${escapeHtml(checkinLabel)}</div>
      </div>
      <div class="card">
        <div class="label">Check-out</div>
        <div class="value">${escapeHtml(checkoutLabel)}</div>
      </div>
      <div class="card">
        <div class="label">Guests</div>
        <div class="value">${escapeHtml(guestsLabel)}</div>
      </div>
      <div class="card">
        <div class="label">Total Paid</div>
        <div class="value">${escapeHtml(totalLabel)}</div>
      </div>
    </div>

    <div class="section card">
      <div class="label">Cancellation policy</div>
      <div class="value">${escapeHtml(cancelLabel)}</div>
      ${details.refundableTag ? `<div class="subtitle" style="margin:10px 0 0">Refundable tag: ${escapeHtml(details.refundableTag)}</div>` : ""}
    </div>

    <div class="footer">
      <div><b>Need help?</b> Your booking is secured. If you have questions, please contact support with your booking reference.</div>
      <div style="margin-top:6px">LuxeStayHaven · Secure checkout powered by LiteAPI</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LuxeStayHaven-${safeBookingId}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [details, prebookId]);

  const runFinalize = useCallback(async () => {
    if (!prebookId || !transactionId) return;
    if (finalizeInFlight.current) return;
    finalizeInFlight.current = true;

    setLoading(true);
    setError(null);

    try {
      const result = await finalizeBooking(prebookId, transactionId, environment);

      setBookingPayload(result);
    } catch (err) {
      setError(err.message || "Failed to confirm booking");
    } finally {
      setLoading(false);
      finalizeInFlight.current = false;
    }
  }, [prebookId, transactionId, environment]);

  useEffect(() => {
    if (!prebookId || !transactionId) return;
    runFinalize();
  }, [prebookId, transactionId, runFinalize]);

  useEffect(() => {
    if (loading || error || !bookingPayload) return;
    const revenue =
      details.amount != null && Number.isFinite(Number(details.amount)) ? Number(details.amount) : null;
    const currency = "USD";
    const hotelId =
      details.bookingData?.hotel?.id ||
      details.bookingData?.hotelId ||
      details.bookingData?.hotel?.hotelId ||
      "";
    trackOnce(`booking_complete:${details.bookingId || prebookId}`, "booking_complete", {
      event_category: "ecommerce",
      event_label: details.bookingId || prebookId || undefined,
      booking_id: details.bookingId || prebookId || undefined,
      hotel_name: details.hotelName || undefined,
      currency,
      revenue: revenue == null ? undefined : revenue,
      value: revenue == null ? undefined : revenue,
      items: [
        {
          item_id: hotelId || undefined,
          item_name: details.hotelName || "Hotel",
          price: revenue == null ? undefined : revenue,
          quantity: 1
        }
      ]
    });
  }, [bookingPayload, details.amount, details.bookingId, details.currency, details.hotelName, error, loading, prebookId]);

  if (!prebookId || !transactionId) {
    return (
      <section className="bg-background py-10 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-soft p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="font-heading text-2xl text-primary mb-2">
              No booking found
            </h1>
            <p className="text-sm text-textMedium mb-6">
              This page is shown after payment. Please return to the home page and
              make a new booking.
            </p>
            {!transactionId && prebookId && (
              <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-left text-xs text-warning">
                <div className="font-semibold">Debug</div>
                <div className="mt-1 break-all">
                  transactionId is missing from the URL. Current URL: {window.location.href}
                </div>
              </div>
            )}
            <Button type="button" onClick={() => navigate("/")}>
              Go home
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-10 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-soft overflow-hidden">
          <div className="bg-success/5 p-8 text-center border-b border-slate-50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success text-white shadow-lg shadow-success/20">
              <svg
                className="w-9 h-9"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="mt-5 font-heading text-3xl text-primary">
              Booking confirmed
            </h1>
            <p className="mt-2 text-sm text-textMedium">
              Thank you for choosing LuxeStayHaven. We’re finalizing your booking
              details.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 text-xs text-textMedium">
              <div>
                <div className="text-textLight">Prebook ID</div>
                <div className="font-medium text-textDark break-all">
                  {prebookId}
                </div>
              </div>
              <div>
                <div className="text-textLight">Transaction ID</div>
                <div className="font-medium text-textDark break-all">
                  {transactionId}
                </div>
              </div>
            </div>

            {loading && (
              <div className="text-xs text-textMedium flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                Confirming your booking…
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-error text-xs">
                <div className="font-semibold">We couldn’t confirm your booking</div>
                <div className="mt-1">{error}</div>
                <div className="mt-3">
                  <Button type="button" variant="secondary" onClick={runFinalize}>
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && bookingPayload && (
              <div className="rounded-2xl bg-background px-5 py-5 space-y-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs text-textMedium">
                  <div>
                    <div className="text-textLight">Booking reference</div>
                    <div className="font-semibold text-textDark break-all">
                      {details.bookingId || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Hotel confirmation</div>
                    <div className="font-medium text-textDark break-all">
                      {details.hotelConfirmationNumber || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Hotel</div>
                    <div className="font-medium text-textDark">
                      {details.hotelName || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Room</div>
                    <div className="font-medium text-textDark">
                      {details.roomType || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Check-in</div>
                    <div className="font-medium text-textDark">
                      {details.checkin ? formatDate(details.checkin) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Check-out</div>
                    <div className="font-medium text-textDark">
                      {details.checkout ? formatDate(details.checkout) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Guests</div>
                    <div className="font-medium text-textDark">
                      {details.guestsSummary || details.guestName || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Total paid</div>
                    <div className="font-semibold text-primary">
                      {details.amount != null && details.currency ? (
                        formatCurrency(details.amount, details.currency)
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={handleDownloadConfirmation}
                  >
                    Download confirmation
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => setShowDetails((v) => !v)}
                  >
                    View booking details
                  </Button>
                </div>

                {showDetails && (
                  <div className="rounded-2xl border border-slate-100 bg-white shadow-soft p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Booking details
                        </div>
                        <div className="text-sm font-medium text-textDark">
                          Key information
                        </div>
                      </div>
                      <div className="text-[11px] text-textLight">
                        Status:{" "}
                        <span className="font-medium text-textDark">
                          {details.status || "CONFIRMED"}
                        </span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Booking reference
                        </div>
                        <div className="mt-1 font-semibold text-textDark break-all">
                          {details.bookingId || prebookId || "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Hotel confirmation code
                        </div>
                        <div className="mt-1 font-medium text-textDark break-all">
                          {details.hotelConfirmationNumber || "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Hotel
                        </div>
                        <div className="mt-1 font-medium text-textDark">
                          {details.hotelName || "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Room type + board
                        </div>
                        <div className="mt-1 font-medium text-textDark">
                          {[details.roomType, details.board].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Dates
                        </div>
                        <div className="mt-1 font-medium text-textDark">
                          {details.checkin ? formatDate(details.checkin) : "—"} –{" "}
                          {details.checkout ? formatDate(details.checkout) : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Guests
                        </div>
                        <div className="mt-1 font-medium text-textDark">
                          {formatGuestsInline(details.bookingData, details.guestsSummary || details.guestName)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Total paid
                        </div>
                        <div className="mt-1 font-semibold text-primary">
                          {details.amount != null ? formatCurrency(details.amount, details.currency || "USD") : "—"}
                        </div>
                        <div className="mt-1 text-[11px] text-textLight">
                          Currency: {(details.currency || "USD").toUpperCase()}
                        </div>
                      </div>
                      <div className="rounded-xl bg-background border border-slate-100 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-textLight">
                          Cancellation policy
                        </div>
                        <div className="mt-1 font-medium text-textDark">
                          {(() => {
                            const deadline = pickFreeCancellationDeadline(details.cancelPolicyInfos);
                            if (deadline) return `Free cancellation until ${deadline}`;
                            if (details.refundableTag === "RFN") return "Refundable";
                            if (details.refundableTag) return `Refundable tag: ${details.refundableTag}`;
                            return "—";
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowRaw((v) => !v)}
                        className="text-xs font-medium text-accent hover:text-accentAlt"
                      >
                        {showRaw ? "Hide raw JSON" : "Show raw JSON"}
                      </button>
                      <div className="text-[11px] text-textLight">
                        For debugging only
                      </div>
                    </div>

                    {showRaw && (
                      <pre className="text-[11px] text-textMedium overflow-auto max-h-[420px] whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4">
                        {JSON.stringify(details.bookingWrapper, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-textLight">
                  Environment: {environment}. A confirmation email will be sent to
                  the guest email address on the reservation.
                </div>
              </div>
            )}

            <div className="pt-1 flex flex-col sm:flex-row gap-3">
              <Link to="/search" className="flex-1">
                <Button type="button" className="w-full">
                  Book another stay
                </Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button type="button" variant="secondary" className="w-full">
                  Go home
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-textLight uppercase tracking-[0.28em] font-semibold">
          LuxeStayHaven · Secure Checkout
        </div>
      </div>
    </section>
  );
}

export default Confirmation;
