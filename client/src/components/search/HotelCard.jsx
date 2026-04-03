import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { formatCurrency } from "../../utils/formatters.js";
import useSearchStore from "../../stores/useSearchStore.js";
import FavoriteButton from "../ui/FavoriteButton.jsx";

function HotelCard({ rate, searchParams }) {
  const { checkin, checkout, adults, environment } = useSearchStore();
  const location = useLocation();

  const hotel = rate.hotel || {};
  const roomTypes = Array.isArray(rate?.roomTypes) ? rate.roomTypes : [];
  const cheapestOffer = roomTypes.reduce((best, rt) => {
    const offers = Array.isArray(rt?.rates) ? rt.rates : [];
    for (const o of offers) {
      const raw =
        o?.retailRate?.total?.[0]?.amount ??
        o?.retailRate?.amount ??
        o?.retailRate?.totalAmount ??
        null;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) continue;
      if (!best || n < best.amount) {
        best = { offer: o, amount: n };
      }
    }
    return best;
  }, null);
  const offer = cheapestOffer?.offer || null;

  const image =
    hotel.main_photo ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80";

  const price = cheapestOffer?.amount ?? null;
  const originalRaw = offer?.retailRate?.suggestedSellingPrice?.[0]?.amount ?? null;
  const original = originalRaw == null ? null : Number(originalRaw);
  const stars = hotel.stars || hotel.starRating || hotel.rating || null;
  const reviews = hotel.reviewCount || hotel.reviewsCount || hotel.reviews || null;

  const resolved = {
    checkin: searchParams?.checkin ?? checkin ?? "",
    checkout: searchParams?.checkout ?? checkout ?? "",
    adults: searchParams?.adults ?? adults ?? 2,
    environment: searchParams?.environment ?? environment ?? "sandbox"
  };

  // Card click navigates to the hotel details page while preserving search params.
  const detailsParams = new URLSearchParams(location.search || "");
  detailsParams.set("checkin", resolved.checkin);
  detailsParams.set("checkout", resolved.checkout);
  detailsParams.set("adults", String(resolved.adults));
  detailsParams.set("environment", resolved.environment);
  const detailsHref = detailsParams.toString()
    ? `/hotel/${hotel.id}?${detailsParams.toString()}`
    : `/hotel/${hotel.id}`;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="group flex flex-col rounded-2xl bg-white shadow-soft overflow-hidden border border-slate-100 hover:shadow-xl transition cursor-pointer"
    >
      <Link to={detailsHref} className="flex flex-col h-full">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={image}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
            {hotel.category || "Luxury hotel"}
          </div>
          <div className="absolute top-3 right-3">
            <FavoriteButton hotelId={hotel.id} />
          </div>
        </div>
        <div className="flex-1 flex flex-col px-4 pt-3 pb-4 gap-3">
          <div>
            <h3 className="font-heading text-base text-primary">
              {hotel.name || "Hotel"}
            </h3>
            <p className="text-[11px] text-textLight mt-0.5">
              {hotel.address || hotel.cityName}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 text-textMedium">
              <div className="text-accent font-semibold">
                {stars ? `${stars}★` : "★"}
              </div>
              <div className="text-textLight">
                {reviews ? `${reviews} reviews` : "Premium stay"}
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between">
            <div className="text-xs text-textMedium">
              <div className="text-[11px] uppercase tracking-wide text-textLight">
                Starting from
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(price)}
                </span>
                {Number.isFinite(original) && original !== price && (
                  <span className="text-[11px] text-textLight line-through">
                    {formatCurrency(original)}
                  </span>
                )}
                <span className="text-[11px] text-textLight">per night</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default HotelCard;
