import React from "react";

function HotelInfo({ hotelInfo }) {
  if (!hotelInfo) return null;

  const name = hotelInfo.hotelName || hotelInfo.name;

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-3">
      <div>
        <h1 className="font-heading text-2xl text-primary">{name}</h1>
        <p className="text-xs text-textLight mt-0.5">{hotelInfo.address}</p>
      </div>
      <p className="text-xs text-textMedium">
        {hotelInfo.hotelDescription || "A carefully curated luxury property."}
      </p>
    </section>
  );
}

export default HotelInfo;

