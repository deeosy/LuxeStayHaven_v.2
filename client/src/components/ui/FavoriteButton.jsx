import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "luxestayhaven:favorites";

function readFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function FavoriteButton({ hotelId, className = "", onChange }) {
  const id = useMemo(() => (hotelId != null ? String(hotelId) : ""), [hotelId]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsFavorite(readFavorites().includes(id));
  }, [id]);

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id) return;

    const next = new Set(readFavorites());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const nextArr = Array.from(next);
    writeFavorites(nextArr);
    setIsFavorite(nextArr.includes(id));
    if (typeof onChange === "function") onChange(nextArr);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-white/40 shadow-sm hover:bg-white transition ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isFavorite ? "text-accent" : "text-slate-700"}
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}

export default FavoriteButton;

