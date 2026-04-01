import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useSearchStore from "../stores/useSearchStore.js";
import Button from "../components/ui/Button.jsx";
import { finalizeBooking } from "../utils/api.js";

function normalizeTransactionId(searchParams) {
  return (
    searchParams.get("transactionId") ||
    searchParams.get("transactionID") ||
    searchParams.get("transaction_id") ||
    ""
  );
}

function pickBookingDetails(payload) {
  const booking = payload?.booking || payload?.data || payload;

  const bookingId =
    booking?.bookingId ||
    booking?.bookingID ||
    booking?.reference ||
    booking?.id ||
    payload?.bookingId ||
    "";

  const hotelName =
    booking?.hotel?.name ||
    booking?.hotelName ||
    booking?.hotel?.hotelName ||
    "";

  const checkin = booking?.checkin || booking?.dates?.checkin || "";
  const checkout = booking?.checkout || booking?.dates?.checkout || "";

  const roomType =
    booking?.bookedRooms?.[0]?.roomType?.name || booking?.roomType || "";

  const amount =
    booking?.bookedRooms?.[0]?.rate?.retailRate?.total?.amount ||
    booking?.totalAmount ||
    booking?.price?.gross ||
    booking?.price?.amount ||
    null;

  const currency =
    booking?.bookedRooms?.[0]?.rate?.retailRate?.total?.currency ||
    booking?.price?.currency ||
    booking?.currency ||
    "";

  const guestName =
    booking?.holder?.firstName || booking?.holder?.lastName
      ? `${booking?.holder?.firstName || ""} ${booking?.holder?.lastName || ""}`.trim()
      : "";

  return {
    bookingId,
    hotelName,
    checkin,
    checkout,
    roomType,
    amount,
    currency,
    guestName
  };
}

function Confirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { environment: defaultEnvironment } = useSearchStore();

  const prebookId = searchParams.get("prebookId") || "";
  const transactionId =
    searchParams.get("transactionId") || normalizeTransactionId(searchParams);
  const environment =
    searchParams.get("environment") || defaultEnvironment || "sandbox";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingPayload, setBookingPayload] = useState(null);

  const details = useMemo(
    () => pickBookingDetails(bookingPayload),
    [bookingPayload]
  );

  const runFinalize = useCallback(async () => {
    if (!prebookId || !transactionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await finalizeBooking(prebookId, transactionId, environment);

      setBookingPayload(result);
    } catch (err) {
      setError(err.message || "Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  }, [prebookId, transactionId, environment]);

  useEffect(() => {
    if (!prebookId || !transactionId) return;
    runFinalize();
  }, [prebookId, transactionId, runFinalize]);

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
                      {details.checkin || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Check-out</div>
                    <div className="font-medium text-textDark">
                      {details.checkout || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Total paid</div>
                    <div className="font-semibold text-primary">
                      {details.amount != null && details.currency
                        ? `${details.amount} ${details.currency}`
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled
                  >
                    Download confirmation
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled
                  >
                    View booking details
                  </Button>
                </div>

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
