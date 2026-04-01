import React from "react";

function HotelInfo({ hotelInfo }) {
  if (!hotelInfo) return null;

  const name = hotelInfo.hotelName || hotelInfo.name;
  const stars =
    hotelInfo.stars ??
    hotelInfo.starRating ??
    hotelInfo.hotelStars ??
    hotelInfo?.category?.stars ??
    null;

  const rawAmenities =
    hotelInfo.amenities ||
    hotelInfo.hotelAmenities ||
    hotelInfo.facilities ||
    hotelInfo.hotelFacilities ||
    [];

  const amenities = Array.isArray(rawAmenities)
    ? rawAmenities
        .map((a) => (typeof a === "string" ? a : a?.name || a?.title))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-3">
      <div>
        <h1 className="font-heading text-2xl text-primary">{name}</h1>
        <p className="text-xs text-textLight mt-0.5">{hotelInfo.address}</p>
      </div>
      {(stars || amenities.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-textMedium">
          {stars ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/5 text-primary px-2.5 py-0.5 font-semibold">
              <span>{stars}</span>
              <span className="text-[10px] uppercase tracking-wide">Star</span>
            </div>
          ) : null}
          {amenities.map((a) => (
            <span
              key={a}
              className="inline-flex items-center rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5"
            >
              {a}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-textMedium">
        {hotelInfo.hotelDescription || "A carefully curated luxury property."}
      </p>
    </section>
  );
}

export default HotelInfo;
