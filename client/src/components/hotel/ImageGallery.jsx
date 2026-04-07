import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// Performance: memoized gallery + lazy-loaded images (modal thumbnails included).
const ImageGallery = React.memo(function ImageGallery({ hotelInfo }) {
  const images = hotelInfo?.hotelImages || [];
  const list = useMemo(() => {
    const urls = images
      .map((x) => x?.url)
      .filter(Boolean);
    if (urls.length > 0) return urls;
    return [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80"
    ];
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const active = list[Math.min(activeIndex, list.length - 1)] || list[0];
  const gridRight = list.slice(1, 5);

  const mainRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.8 });
  const sy = useSpring(my, { stiffness: 60, damping: 18, mass: 0.8 });

  function onMove(e) {
    if (!mainRef.current) return;
    const r = mainRef.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    mx.set(Math.max(-1, Math.min(1, dx)) * 8);
    my.set(Math.max(-1, Math.min(1, dy)) * 8);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setActiveIndex((i) => (i + 1) % list.length);
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i - 1 + list.length) % list.length);
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [list.length, open]);

  return (
    <div className="relative">
      <div className="grid gap-2 lg:grid-cols-[1.6fr_1fr]">
        <div
          ref={mainRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="relative rounded-xl overflow-hidden bg-slate-100 shadow-soft"
        >
          <motion.img
            src={active}
            alt={hotelInfo?.hotelName || "Hotel photo"}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 1024px) 100vw, 70vw"
            className="h-[320px] sm:h-[420px] lg:h-[520px] w-full object-cover"
            style={{ x: sx, y: sy, scale: 1.04 }}
            transition={{ type: "spring", stiffness: 80, damping: 22 }}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
        </div>

        <div className="grid grid-cols-2 gap-2 ">
          {gridRight.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx + 1)}
              className="relative rounded-xl overflow-hidden bg-slate-100 shadow-soft"
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="h-[155px] sm:h-[205px] lg:h-[250px] w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
          {gridRight.length < 4 &&
            Array.from({ length: 4 - gridRight.length }).map((_, i) => (
              <div
                key={`ph-${i}`}
                className="rounded-xl bg-slate-100 border border-slate-100"
              />
            ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 text-xs font-medium text-primary shadow-soft hover:shadow-xl transition"
      >
        <span className="text-[14px]">▦</span>
        Show all photos
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] bg-black/80">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-6 right-6 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15"
            aria-label="Close"
          >
            ×
          </button>

          <div className="h-full w-full flex items-center justify-center px-4">
            <div className="relative w-full max-w-5xl">
              <div className="rounded-xl overflow-hidden bg-black shadow-2xl">
                <img
                  src={active}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  sizes="100vw"
                  className="w-full max-h-[78vh] object-contain bg-black"
                  draggable={false}
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i - 1 + list.length) % list.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i + 1) % list.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15"
                aria-label="Next photo"
              >
                ›
              </button>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {list.slice(0, 12).map((url, idx) => (
                  <button
                    key={`${url}-thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border ${
                      idx === activeIndex ? "border-white" : "border-white/20"
                    }`}
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      sizes="96px"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
              <div className="mt-1 text-center text-xs text-white/70">
                {activeIndex + 1} / {list.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ImageGallery;
