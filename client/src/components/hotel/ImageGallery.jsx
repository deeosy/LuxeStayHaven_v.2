import React, { useState } from "react";

function ImageGallery({ hotelInfo }) {
  const images = hotelInfo?.hotelImages || [];
  const mainImage =
    images[0]?.url ||
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80";
  const [active, setActive] = useState(mainImage);

  const thumbs = images.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden shadow-soft bg-slate-100">
        <img
          src={active}
          alt={hotelInfo?.hotelName}
          className="w-full h-64 sm:h-80 lg:h-96 object-cover"
        />
      </div>
      {thumbs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {thumbs.map((img) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(img.url)}
              className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border ${
                active === img.url
                  ? "border-accent ring-1 ring-accent/40"
                  : "border-slate-200"
              }`}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageGallery;

