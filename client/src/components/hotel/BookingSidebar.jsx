import React from "react";
import useBookingStore from "../../stores/useBookingStore.js";
import useSearchStore from "../../stores/useSearchStore.js";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import { useNavigate } from "react-router-dom";

function BookingSidebar() {
  const navigate = useNavigate();
  const { selectedHotel, selectedOffer } = useBookingStore();
  const { checkin, checkout, adults } = useSearchStore();

  const handleCheckout = () => {
    if (selectedOffer) {
      navigate("/checkout");
    }
  };

  return (
    <aside className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-3 text-sm">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-textLight">
          Trip summary
        </div>
        <div className="font-heading text-lg text-primary">
          {selectedHotel?.hotelName || selectedHotel?.name || "Select a room"}
        </div>
      </div>
      {checkin && checkout && (
        <div className="text-xs text-textMedium">
          <div>
            {formatDate(checkin)} – {formatDate(checkout)}
          </div>
          <div>
            {adults} guest{adults > 1 ? "s" : ""}
          </div>
        </div>
      )}
      {selectedOffer ? (
        <>
          <div className="border-t border-slate-100 pt-3 space-y-1">
            <div className="text-xs text-textMedium">
              {selectedOffer.rateName}
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-textLight">Total estimated</div>
              <div className="text-right">
                <div className="text-lg font-semibold text-primary">
                  {formatCurrency(selectedOffer.price)}
                </div>
              </div>
            </div>
          </div>
          <Button type="button" className="w-full" onClick={handleCheckout}>
            Book this stay
          </Button>
        </>
      ) : (
        <p className="text-xs text-textMedium">
          Choose a room rate to see your total and continue to secure checkout.
        </p>
      )}
    </aside>
  );
}

export default BookingSidebar;

