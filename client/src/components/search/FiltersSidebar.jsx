import React from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

const FiltersSidebar = React.memo(function FiltersSidebar({
  filtersOpen,
  setFiltersOpen,
  activeFilterCount,
  clearAllFilters,
  priceBounds,
  draftPriceMin,
  setDraftPriceMin,
  draftPriceMax,
  setDraftPriceMax,
  draftMinStars,
  setDraftMinStars,
  draftRefundableOnly,
  setDraftRefundableOnly,
  applyFilters,
  loading
}) {
  return (
    <div
      className={`rounded-2xl bg-white border border-slate-100 shadow-soft p-4 sm:p-5 space-y-6 text-sm ${
        filtersOpen ? "" : "hidden lg:block"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-lg text-primary">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent/10 px-2 text-xs font-medium text-accent">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-medium text-accent hover:text-accentAlt"
            >
              Clear all
            </button>
          )}
          <div className="lg:hidden">
            <Button type="button" variant="ghost" onClick={() => setFiltersOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-textLight">Price range</div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="minPrice"
            type="number"
            label="Min"
            placeholder={priceBounds ? String(Math.floor(priceBounds.min)) : "0"}
            value={draftPriceMin}
            min={0}
            onChange={(e) => setDraftPriceMin(e.target.value)}
          />
          <Input
            id="maxPrice"
            type="number"
            label="Max"
            placeholder={priceBounds ? String(Math.ceil(priceBounds.max)) : "2000"}
            value={draftPriceMax}
            min={0}
            onChange={(e) => setDraftPriceMax(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-textLight">
          <span>{priceBounds ? "Best available rate" : "—"}</span>
          <span>Per night</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-textLight">Stars</div>
        <div className="grid grid-cols-3 gap-2">
          {[3, 4, 5].map((n) => {
            const active = draftMinStars === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setDraftMinStars((cur) => (cur === n ? 0 : n))}
                className={[
                  "rounded-full border px-3 py-2 text-xs transition",
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-slate-200 bg-white text-textMedium hover:border-slate-300"
                ].join(" ")}
              >
                {n === 5 ? "5" : `${n}+`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-textLight">Refundable</div>
        <label className="flex items-center gap-2 text-xs text-textMedium">
          <input
            type="checkbox"
            checked={draftRefundableOnly}
            onChange={(e) => setDraftRefundableOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show refundable only
        </label>
      </div>

      <div className="pt-2 border-t border-slate-100 flex gap-2">
        <Button type="button" className="flex-1" onClick={applyFilters} disabled={loading}>
          Apply
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={clearAllFilters}
          disabled={loading}
        >
          Clear
        </Button>
      </div>
    </div>
  );
});

export default FiltersSidebar;

