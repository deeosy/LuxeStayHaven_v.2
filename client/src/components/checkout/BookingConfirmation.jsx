import React from "react";
import { motion } from "framer-motion";
import useBookingStore from "../../stores/useBookingStore.js";
import { formatDate, formatCurrency } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import { Link } from "react-router-dom";

function BookingConfirmation() {
  const { bookingConfirmation } = useBookingStore();

  if (!bookingConfirmation) {
    return (
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
        <h2 className="text-xl font-heading text-primary mb-2">No Booking Found</h2>
        <p className="text-sm text-textMedium mb-6">We couldn't find any recent booking details for your session.</p>
        <Link to="/">
          <Button variant="primary">Return to Home</Button>
        </Link>
      </div>
    );
  }


  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto "
    >
      <div className=" flex flex-col md:flex-row gap-6 "> 
        <div className="flex-1 min-w-0 rounded-3xl bg-white border min-h-full border-slate-100 shadow-soft overflow-hidden">
          {/* Success Header */}
          <div className="bg-success/5 p-8 text-center border-b border-slate-50">
            <div className="flex items-center sm:justify-around justify-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success text-white mb-6 shadow-lg shadow-success/20"
              >
                <svg
                  className="w-10 h-10"
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
              </motion.div>
              <div className="">
                <h1 className="font-heading text-3xl text-primary mb-3">Booking Confirmed!</h1>
                <p className="text-textMedium max-w-md mx-auto">
                  Thank you for choosing LuxeStayHaven. Your reservation at <span className="font-semibold text-textDark">{bookingConfirmation.hotelName}</span> is successfully confirmed.
                </p>
              </div>

            </div>
          </div>

          {/* Details Section */}
          <div className="p-8 space-y-10">
            {/* Main Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-textLight">
                  <span className="text-primary/60">#</span>
                  Booking Reference
                </div>
                <div className="text-lg font-medium text-textDark tracking-tight">
                  {bookingConfirmation.bookingId}
                </div>
              </div>

              {bookingConfirmation.hotelConfirmationNumber && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-textLight">
                    <span className="text-primary/60">H</span>
                    Hotel Confirmation
                  </div>
                  <div className="text-lg font-medium text-textDark tracking-tight">
                    {bookingConfirmation.hotelConfirmationNumber}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-textLight">
                  <span className="text-primary/60">i</span>
                  Status
                </div>
                <div className="inline-flex px-2.5 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-bold uppercase tracking-wider">
                  {bookingConfirmation.status}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-textLight">
                  <span className="text-primary/60">H</span>
                  Hotel
                </div>
                <div className="text-base font-medium text-textDark">
                  {bookingConfirmation.hotelName}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-textLight">
                  <span className="text-primary/60">D</span>
                  Stay Dates
                </div>
                <div className="text-base font-medium text-textDark">
                  {formatDate(bookingConfirmation.checkin)} – {formatDate(bookingConfirmation.checkout)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-textLight">
                  <span className="text-primary/60">R</span>
                  Room Type
                </div>
                <div className="text-base font-medium text-textDark truncate" title={bookingConfirmation.roomType}>
                  {bookingConfirmation.roomType}
                </div>
              </div>
            </div>

            {/* Guest & Price Info */}
            <div className="grid sm:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-bold text-primary">Guest Details</h3>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-textDark">
                    {bookingConfirmation.guestFirstName} {bookingConfirmation.guestLastName}
                  </div>
                  <div className="text-xs text-textMedium italic">
                    {bookingConfirmation.guestEmail}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-bold text-primary">Total Paid</h3>
                <div className="space-y-1">
                  <div className="text-xl font-heading text-primary">
                    {formatCurrency(bookingConfirmation.totalAmount, bookingConfirmation.currency)}
                  </div>
                  <div className="text-[10px] text-textLight uppercase tracking-wide">
                    Paid via Secure Transaction
                  </div>
                </div>
              </div>
            </div>

            {/* Policies & Remarks */}
            <div className="grid sm:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider font-bold text-primary">Cancellation Policy</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-textMedium">
                    <div className="h-1 w-1 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>
                      Cancel by: <span className="font-semibold text-textDark">{bookingConfirmation.cancelBy}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-textMedium">
                    <div className="h-1 w-1 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>
                      Fee: <span className="font-semibold text-textDark">{bookingConfirmation.cancelFee} {bookingConfirmation.currency}</span>
                    </span>
                  </div>
                </div>
              </div>

              {bookingConfirmation.remarks && bookingConfirmation.remarks !== "No additional remarks." && (
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-primary">Special Remarks</h3>
                  <p className="text-xs text-textMedium leading-relaxed italic">
                    &ldquo;{bookingConfirmation.remarks}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex gap-4 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none py-3 px-6"
                  onClick={() => window.print()}
                >
                  Print / Save PDF
                </Button>
                <Link to="/" className="flex-1 sm:flex-none">
                  <Button variant="primary" className="w-full py-3 px-8">
                    Home
                  </Button>
                </Link>
              </div>
              <p className="text-[11px] mt-2 text-textLight italic ">
                A detailed confirmation email has been sent to your address.
              </p>
            </div>
          </div>
        </div>

        {/* What to Expect Section */}
        <div className="w-full lg:w-80 md:flex-shrink-0 rounded-3xl bg-primary text-white p-8 shadow-soft overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="font-heading text-white text-xl mb-6 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">!</span>
            What to expect next
          </h2>
          <div className="flex flex-col gap-8">
            <div className="space-y-3">
              <div className="text-accent font-bold text-sm tracking-wider uppercase">1. Check Email</div>
              <p className="text-xs text-slate-200 leading-relaxed">
                You will receive a confirmation email within minutes containing your full itinerary and contact details for the hotel.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-accent font-bold text-sm tracking-wider uppercase">2. Present Reference</div>
              <p className="text-xs text-slate-200 leading-relaxed">
                When you arrive at the hotel, simply present your Booking Reference or Hotel Confirmation ID and a valid government-issued ID.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-accent font-bold text-sm tracking-wider uppercase">3. Enjoy Your Stay</div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Your room is guaranteed. If you need any assistance before or during your stay, our 24/7 support team is here to help.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Security Footer */}
      <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-textLight uppercase tracking-widest font-semibold pb-12">
        <span className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          SSL Secured
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Guaranteed Stay
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          24/7 Support
        </span>
      </div>
    </motion.section>
  );
}

export default BookingConfirmation;

