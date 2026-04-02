import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import { formatCurrency } from "../../utils/formatters.js";
import useSearchStore from "../../stores/useSearchStore.js";
import FavoriteButton from "../ui/FavoriteButton.jsx";

function HotelCard({ rate }) {
  const navigate = useNavigate();
  const { checkin, checkout, adults } = useSearchStore();

  const hotel = rate.hotel || {};
  const roomType = rate.roomTypes?.[0];
  const offer = roomType?.rates?.[0];

  const image =
    hotel.main_photo ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80";

  const price = offer?.retailRate?.total?.[0]?.amount;
  const original = offer?.retailRate?.suggestedSellingPrice?.[0]?.amount;
  const refundableTag = offer?.cancellationPolicies?.refundableTag;
  const boardName = offer?.boardName;
  const stars = hotel.stars || hotel.starRating || hotel.rating || null;
  const reviews = hotel.reviewCount || hotel.reviewsCount || hotel.reviews || null;

  const handleViewDetails = () => {
    navigate(
      `/hotel/${hotel.id}?checkin=${checkin}&checkout=${checkout}&adults=${adults}`
    );
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="flex flex-col rounded-2xl bg-white shadow-soft overflow-hidden border border-slate-100 cursor-pointer"
      onClick={handleViewDetails}
      role="button"
      tabIndex={0}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={hotel.name}
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
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
          {refundableTag === "RFN" ? (
            <Badge color="success">Refundable</Badge>
          ) : (
            <Badge color="error">Non-refundable</Badge>
          )}
          {boardName && <Badge color="info">{boardName}</Badge>}
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
              {original && original !== price && (
                <span className="text-[11px] text-textLight line-through">
                  {formatCurrency(original)}
                </span>
              )}
              <span className="text-[11px] text-textLight">per night</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleViewDetails();
              }}
            >
              View details
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default HotelCard;
