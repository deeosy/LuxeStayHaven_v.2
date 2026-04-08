import React from "react";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import { formatCurrency } from "../../utils/formatters.js";

function firstUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value?.url === "string") return value.url;
  return "";
}

function pickFirstImageUrl(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  for (const item of list) {
    const url = firstUrl(item);
    if (url) return url;
  }
  return "";
}

function resolveRoomThumbnail(offer) {
  const roomSpecific =
    pickFirstImageUrl(offer?.roomType?.images) ||
    pickFirstImageUrl(offer?.roomType?.roomImages) ||
    pickFirstImageUrl(offer?.roomTypeImages) ||
    pickFirstImageUrl(offer?.roomImages) ||
    pickFirstImageUrl(offer?.images) ||
    firstUrl(offer?.roomImageUrl) ||
    firstUrl(offer?.roomImage) ||
    firstUrl(offer?.imageUrl) ||
    firstUrl(offer?.image);

  if (roomSpecific) return roomSpecific;

  const hotelImages = Array.isArray(offer?.hotelImages) ? offer.hotelImages : [];
  if (hotelImages.length > 0) {
    const urls = hotelImages.map(firstUrl).filter(Boolean);
    const idxRaw = offer?.imageIndex;
    const idx = Number.isFinite(Number(idxRaw)) ? Number(idxRaw) : 0;
    const picked = urls.length > 0 ? urls[idx % urls.length] : "";
    if (picked) return picked;
  }

  const hotelMain = firstUrl(offer?.hotelMainPhoto) || firstUrl(offer?.hotelPhoto);
  if (hotelMain) return hotelMain;

  return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
}

// Thumbnail priority: room-level images (when present) → hotel images (stable per offer) → premium fallback.
function CheckItem({ children }) {
  return (
    <div className="flex items-start gap-2 text-xs text-textMedium">
      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent/10 text-accent">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="leading-5">{children}</span>
    </div>
  );
}

function buildUnsplashSrcSet(url) {
  const s = String(url || "");
  if (!s.includes("images.unsplash.com/")) return "";
  const widths = [200, 320, 480, 640];
  return widths
    .map((w) => {
      const hasW = /[?&]w=\d+/.test(s);
      const withW = hasW ? s.replace(/([?&]w=)\d+/, `$1${w}`) : `${s}${s.includes("?") ? "&" : "?"}w=${w}`;
      return `${withW} ${w}w`;
    })
    .join(", ");
}

const RoomCard = React.memo(function RoomCard({ offer, onSelect, selected = false }) {
  const { rateName, board, refundableTag, retailRate, originalRate, isBestDeal, amenities } = offer;
  const list = Array.isArray(amenities) && amenities.length > 0 ? amenities : [];
  const shownAmenities =
    list.length > 0
      ? list.slice(0, 5)
      : [
          "Free Wi‑Fi",
          "Air conditioning",
          "Private bathroom",
          "Premium bedding",
          board ? String(board) : "Room only options"
        ].filter(Boolean);

  const thumb = resolveRoomThumbnail(offer);
  const srcSet = buildUnsplashSrcSet(thumb);

  return (
    <div className={`rounded-2xl border bg-white shadow-soft transition ${selected ? "border-accent ring-2 ring-accent/20" : "border-slate-100 hover:border-slate-200"}`}>
      <div className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0 flex gap-4">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-soft flex-shrink-0">
              <img
                src={thumb}
                alt=""
                loading="lazy"
                decoding="async"
                sizes="112px"
                srcSet={srcSet || undefined}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base sm:text-lg text-primary truncate">
                  {rateName}
                </h3>
                {isBestDeal && (
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
                    Best deal
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {shownAmenities.map((a) => (
                  <CheckItem key={a}>{a}</CheckItem>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[240px] shrink-0 rounded-xl border border-slate-100 bg-background p-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="text-textDark font-medium">
                {board || "Room only"}
              </div>
              {refundableTag === "RFN" ? (
                <Badge color="success">Refundable</Badge>
              ) : (
                <Badge color="error">Non-refundable</Badge>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-textLight">
                  Total
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-xl font-semibold text-primary">
                    {formatCurrency(retailRate)}
                  </div>
                  {originalRate && originalRate !== retailRate ? (
                    <div className="text-xs text-textLight line-through">
                      {formatCurrency(originalRate)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                className="w-full"
                variant={selected ? "primary" : "secondary"}
                onClick={onSelect}
              >
                {selected ? "Selected" : "Select this room"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RoomCard;
