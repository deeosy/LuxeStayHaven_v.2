import React from "react";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import { formatCurrency } from "../../utils/formatters.js";

function RoomCard({ offer, onSelect }) {
  const { rateName, board, refundableTag, retailRate, originalRate } = offer;

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <div className="space-y-1">
        <div className="font-medium text-textDark">{rateName}</div>
        <div className="flex gap-2 text-xs">
          {board && <Badge color="info">{board}</Badge>}
          {refundableTag === "RFN" ? (
            <Badge color="success">Refundable</Badge>
          ) : (
            <Badge color="error">Non-refundable</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-textMedium">
          <div className="text-[11px] uppercase tracking-wide text-textLight">
            Per stay
          </div>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-base font-semibold text-primary">
              {formatCurrency(retailRate)}
            </span>
            {originalRate && originalRate !== retailRate && (
              <span className="text-[11px] text-textLight line-through">
                {formatCurrency(originalRate)}
              </span>
            )}
          </div>
        </div>
        <Button type="button" onClick={onSelect}>
          Book now
        </Button>
      </div>
    </div>
  );
}

export default RoomCard;
