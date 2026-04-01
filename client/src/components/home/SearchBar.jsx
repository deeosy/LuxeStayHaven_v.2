import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useSearchStore from "../../stores/useSearchStore.js";
import Input from "../ui/Input.jsx";
import GuestSelector from "../ui/GuestSelector.jsx";
import Button from "../ui/Button.jsx";

function SearchBar() {
  const {
    searchMode,
    setSearchMode,
    destinationName,
    setDestination,
    aiSearchQuery,
    setAiSearchQuery,
    checkin,
    checkout,
    setDates,
    adults,
    setAdults
  } = useSearchStore();

  const [localDestination, setLocalDestination] = useState(destinationName);
  const [localCheckin, setLocalCheckin] = useState(checkin);
  const [localCheckout, setLocalCheckout] = useState(checkout);

  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();

    if (searchMode === "destination" && !localDestination) return;

    setDestination({
      placeId: null,
      destinationName: localDestination
    });
    setDates({ checkin: localCheckin, checkout: localCheckout });

    const url = new URLSearchParams();
    url.set("checkin", localCheckin);
    url.set("checkout", localCheckout);
    url.set("adults", String(adults));

    if (searchMode === "destination") {
      const [city, countryCode] = (localDestination || "").split(",").map((p) =>
        p.trim()
      );
      if (city) url.set("city", city);
      if (countryCode) url.set("countryCode", countryCode);
    } else if (aiSearchQuery) {
      url.set("aiSearch", aiSearchQuery);
    }

    navigate(`/search?${url.toString()}`);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
      onSubmit={handleSearch}
      className="w-full max-w-4xl rounded-2xl bg-white/95 backdrop-blur shadow-soft p-4 sm:p-5 space-y-3"
    >
      <div className="flex gap-4 text-xs font-medium text-textMedium">
        <button
          type="button"
          className={`px-3 py-1.5 rounded-full border ${
            searchMode === "destination"
              ? "border-primary bg-primary text-white"
              : "border-slate-200 bg-slate-50 text-textMedium"
          }`}
          onClick={() => setSearchMode("destination")}
        >
          By destination
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 rounded-full border ${
            searchMode === "vibe"
              ? "border-primary bg-primary text-white"
              : "border-slate-200 bg-slate-50 text-textMedium"
          }`}
          onClick={() => setSearchMode("vibe")}
        >
          By vibe (AI)
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.6fr)_auto] items-end">
        {searchMode === "destination" ? (
          <Input
            id="destination"
            label="Destination"
            placeholder="e.g. Paris, FR"
            value={localDestination}
            onChange={(e) => setLocalDestination(e.target.value)}
          />
        ) : (
          <Input
            id="ai-search"
            label="Search by vibe"
            placeholder="romantic getaway in paris"
            value={aiSearchQuery}
            onChange={(e) => setAiSearchQuery(e.target.value)}
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <Input
            id="checkin"
            label="Check-in"
            type="date"
            value={localCheckin}
            onChange={(e) => setLocalCheckin(e.target.value)}
          />
          <Input
            id="checkout"
            label="Check-out"
            type="date"
            value={localCheckout}
            onChange={(e) => setLocalCheckout(e.target.value)}
          />
        </div>

        <GuestSelector value={adults} onChange={setAdults} />

        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full h-[42px] sm:h-[44px]"
            aria-label="Search stays"
          >
            Search
          </Button>
        </div>
      </div>
    </motion.form>
  );
}

export default SearchBar;

