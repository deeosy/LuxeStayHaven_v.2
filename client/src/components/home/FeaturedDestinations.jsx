import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const destinations = [
  {
    slug: "paris",
    city: "Paris",
    countryCode: "FR",
    price: 520,
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "new-york",
    city: "New York",
    countryCode: "US",
    price: 410,
    image:
      "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "tokyo",
    city: "Tokyo",
    countryCode: "JP",
    price: 450,
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "dubai",
    city: "Dubai",
    countryCode: "AE",
    price: 600,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "rome",
    city: "Rome",
    countryCode: "IT",
    price: 430,
    image:
      "https://images.unsplash.com/photo-1529154036614-a60975f5c760?auto=format&fit=crop&w=1200&q=80"
  },
  {
    slug: "london",
    city: "London",
    countryCode: "GB",
    price: 480,
    image:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1200&q=80"
  }
];

function FeaturedDestinations() {
  const navigate = useNavigate();

  const handleClick = (dest) => {
    navigate(`/destinations/${encodeURIComponent(dest.slug)}`);
  };

  return (
    <section id="destinations" className="bg-background py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl text-primary">
              Featured destinations
            </h2>
            <p className="text-textMedium mt-1 text-sm">
              Escape to the world&apos;s most coveted addresses.
            </p>
          </div>
        </div>

        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.08 }
            }
          }}
        >
          {destinations.map((dest) => (
            <motion.div
              key={dest.city}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(dest)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClick(dest);
              }}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 }
              }}
              className="group text-left rounded-2xl overflow-hidden bg-white shadow-soft hover:-translate-y-1 hover:shadow-xl transition transform focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 cursor-pointer"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.city}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-white font-heading text-lg">
                      {dest.city}
                    </div>
                    <div className="text-xs text-slate-100/80">
                      Luxury stays & curated experiences
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right text-sm text-white">
                      <div className="text-xs uppercase tracking-wide text-slate-200">
                        Starting from
                      </div>
                      <div className="font-semibold">
                        ${dest.price}
                        <span className="text-xs font-normal text-slate-200"> / night</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(dest);
                      }}
                      className="inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/15 border border-white/15"
                    >
                      Explore hotels
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default FeaturedDestinations;
