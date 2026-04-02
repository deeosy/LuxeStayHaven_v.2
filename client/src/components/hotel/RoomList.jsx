import React from "react";
import RoomCard from "./RoomCard.jsx";

function RoomList({ rateInfo, onSelectOffer, selectedOfferId }) {
  const flattened = (rateInfo || []).flat();

  if (!flattened.length) {
    return (
      <section className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 text-sm text-textMedium">
        No rooms available for your dates. Try adjusting your stay.
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-3">
      <h2 className="font-heading text-lg text-primary mb-1">
        Available rooms
      </h2>
      <div className="space-y-2.5">
        {flattened.map((offer, index) => (
          <RoomCard
            key={`${offer.offerId}-${index}`}
            offer={offer}
            selected={selectedOfferId === offer.offerId}
            onSelect={() => onSelectOffer(offer)}
          />
        ))}
      </div>
    </section>
  );
}

export default RoomList;
