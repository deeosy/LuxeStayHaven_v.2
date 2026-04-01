import React from "react";
import { motion } from "framer-motion";
import SearchBar from "./SearchBar.jsx";

const heroImage =
  "https://images.unsplash.com/photo-1542317854-0d6d3a6c2c42?auto=format&fit=crop&w=1600&q=80";

function Hero() {
  return (
    <section className="relative min-h-[70vh] overflow-hidden">
      <img
        src={heroImage}
        alt="Luxury resort overlooking the ocean"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/60" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 flex flex-col gap-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl text-white"
        >
          <p className="uppercase tracking-[0.35em] text-xs text-accent mb-3">
            LUXURY HOTEL COLLECTION
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl leading-tight mb-4">
            LuxeStayHaven
          </h1>
          <p className="text-base sm:text-lg text-slate-100/90 max-w-xl">
            Discover extraordinary stays around the world. Handpicked five-star
            hotels, bespoke experiences, and seamless booking in a single
            elegant journey.
          </p>
        </motion.div>

        <SearchBar />
      </div>
    </section>
  );
}

export default Hero;

