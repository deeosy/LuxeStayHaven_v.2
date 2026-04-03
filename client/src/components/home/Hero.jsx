import React from "react";
import { motion } from "framer-motion";
import SearchBar from "./SearchBar.jsx";

const heroImage =
  "https://static.wixstatic.com/media/5b8aec_6dee2fdfabdf49608414ad1611519d02~mv2.jpg/v1/fill/w_1110,h_624,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/5b8aec_6dee2fdfabdf49608414ad1611519d02~mv2.jpg";

function Hero() {
  return (
    <section className="relative min-h-[82vh] ">
      <img
        src={heroImage}
        alt="Luxury resort overlooking the ocean"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/25" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 flex flex-col gap-10 md:gap-20 ">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-white"
        >
          <p className="uppercase tracking-[0.35em] text-center text-xs text-white mb-1">
            ◆ LUXURY HOTEL COLLECTION
          </p>
          <h1 className="font-heading text-center text-4xl text-accent sm:text-5xl lg:text-7xl leading-tight">
            LuxeStayHaven
          </h1>
          <p className="text-base sm:text-lg text-center text-slate-100/90 max-w-2xl">
            Discover extraordinary stays around the world. Handpicked five-star
            hotels, bespoke experiences, and seamless booking in a single
            elegant journey.
          </p>
        </motion.div>

        {/*
          Testing custom <SearchBar /> again (with improved destination autocomplete).
        */}
        <SearchBar />
      </div>
    </section>
  );
}

export default Hero;
