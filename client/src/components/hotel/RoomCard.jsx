import React from "react";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import { formatCurrency } from "../../utils/formatters.js";

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

function RoomCard({ offer, onSelect, selected = false }) {
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

  return (
    <div className={`rounded-2xl border bg-white shadow-soft transition ${selected ? "border-accent ring-2 ring-accent/20" : "border-slate-100 hover:border-slate-200"}`}>
      <div className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
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
}

export default RoomCard;
