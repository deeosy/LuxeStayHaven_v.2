import React from "react";
import { motion } from "framer-motion";
import useSearchStore from "../../stores/useSearchStore.js";
import HotelCard from "./HotelCard.jsx";
import HotelCardSkeleton from "./HotelCardSkeleton.jsx";
import Button from "../ui/Button.jsx";
import { formatDate } from "../../utils/formatters.js";

function SearchResults({ results, loading, error, onModifySearch }) {
  const { destinationName, checkin, checkout, adults } = useSearchStore();

  return (
    <section className="bg-background min-h-[60vh] py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-textLight">
              Search results
            </p>
            <h2 className="font-heading text-2xl text-primary">
              {destinationName || "Browse luxury stays"}
            </h2>
            <p className="text-xs text-textMedium mt-1">
              {checkin && checkout
                ? `${formatDate(checkin)} – ${formatDate(
                    checkout
                  )} · ${adults} guest${adults > 1 ? "s" : ""}`
                : "Select dates to see the best available rates."}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={onModifySearch}
          >
            Modify search
          </Button>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <HotelCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl bg-white shadow-soft border border-error/20 p-4 text-sm text-error">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-2xl bg-white shadow-soft border border-slate-100 p-8 text-center space-y-3">
            <div className="text-3xl">🌍</div>
            <div className="font-heading text-lg text-primary">
              No hotels found
            </div>
            <p className="text-sm text-textMedium max-w-md mx-auto">
              Try adjusting your dates, choosing a nearby destination, or
              searching with fewer filters to discover more luxury stays.
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.06 }
              }
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {results.map((rate) => (
              <motion.div
                key={rate.hotelId}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <HotelCard rate={rate} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default SearchResults;

