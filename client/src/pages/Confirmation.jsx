import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useSearchStore from "../stores/useSearchStore.js";
import { bookReservation } from "../utils/api.js";
import Button from "../components/ui/Button.jsx";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function Confirmation() {
  const query = useQuery();
  const { environment: defaultEnvironment } = useSearchStore();

  const prebookId = query.get("prebookId") || "";
  const transactionId = query.get("transactionId") || "";
  const environment = query.get("environment") || defaultEnvironment || "sandbox";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!prebookId || !transactionId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setBooking(null);

    bookReservation({ prebookId, transactionId, environment })
      .then((data) => {
        if (cancelled) return;
        setBooking(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to confirm booking");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prebookId, transactionId, environment]);

  return (
    <section className="bg-background py-10 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Booking Successful!
            </h1>
            <p className="mt-2 text-sm text-textMedium">
              We’re confirming your reservation details now.
            </p>
          </div>

          <div className="p-8 space-y-5 text-sm">
            {!prebookId || !transactionId ? (
              <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-error text-xs">
                Missing booking parameters. Please complete payment again.
              </div>
            ) : (
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
            )}

            {loading && (
              <div className="text-xs text-textMedium flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                Confirming booking with the hotel…
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-error text-xs">
                {error}
              </div>
            )}

            {booking?.success && (
              <div className="rounded-2xl bg-background px-4 py-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-textMedium">
                  <div>
                    <div className="text-textLight">Booking ID</div>
                    <div className="font-semibold text-textDark">
                      {booking.bookingId || booking.booking?.bookingId || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-textLight">Environment</div>
                    <div className="font-medium text-textDark">
                      {environment}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-textLight">
                  A confirmation email will be sent to the guest email address on
                  the reservation.
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link to="/" className="flex-1">
                <Button type="button" className="w-full">
                  Back to home
                </Button>
              </Link>
              <Link to="/search" className="flex-1">
                <Button type="button" variant="secondary" className="w-full">
                  Search more hotels
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Confirmation;

