import React from "react";
import { motion } from "framer-motion";
import useSearchStore from "../../stores/useSearchStore.js";
import { useNavigate } from "react-router-dom";

const destinations = [
  {
    city: "Paris",
    countryCode: "FR",
    price: 520,
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80"
  },
  {
    city: "New York",
    countryCode: "US",
    price: 410,
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80"
  },
  {
    city: "Tokyo",
    countryCode: "JP",
    price: 450,
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80"
  },
  {
    city: "Dubai",
    countryCode: "AE",
    price: 600,
    image:
      "https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1200&q=80"
  },
  {
    city: "London",
    countryCode: "GB",
    price: 480,
    image:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1200&q=80"
  },
  {
    city: "Bali",
    countryCode: "ID",
    price: 360,
    image:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80"
  }
];

function FeaturedDestinations() {
  const { checkin, checkout, adults, setDestination, setDates, setAdults } =
    useSearchStore();
  const navigate = useNavigate();

  const handleClick = (dest) => {
    const today = new Date();
    const defaultCheckin = today.toISOString().slice(0, 10);
    const defaultCheckout = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const nextCheckin = checkin || defaultCheckin;
    const nextCheckout = checkout || defaultCheckout;
    const nextAdults = adults || 2;

    setDestination({
      placeId: null,
      destinationName: `${dest.city}, ${dest.countryCode}`
    });
    setDates({ checkin: nextCheckin, checkout: nextCheckout });
    setAdults(nextAdults);
    navigate(
      `/search?city=${encodeURIComponent(
        dest.city
      )}&countryCode=${dest.countryCode}&checkin=${encodeURIComponent(
        nextCheckin
      )}&checkout=${encodeURIComponent(nextCheckout)}&adults=${encodeURIComponent(
        String(nextAdults)
      )}`
    );
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
            <motion.button
              key={dest.city}
              type="button"
              onClick={() => handleClick(dest)}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 }
              }}
              className="group text-left rounded-2xl overflow-hidden bg-white shadow-soft hover:-translate-y-1 hover:shadow-xl transition transform focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.city}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <div>
                    <div className="text-white font-heading text-lg">
                      {dest.city}
                    </div>
                    <div className="text-xs text-slate-100/80">
                      Luxury stays & curated experiences
                    </div>
                  </div>
                  <div className="text-right text-sm text-white">
                    <div className="text-xs uppercase tracking-wide text-slate-200">
                      Starting from
                    </div>
                    <div className="font-semibold">
                      ${dest.price}
                      <span className="text-xs font-normal text-slate-200">
                        {" "}
                        / night
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default FeaturedDestinations;
