import React from "react";
import Hero from "../components/home/Hero.jsx";
import FeaturedDestinations from "../components/home/FeaturedDestinations.jsx";
import WhyLuxeStay from "../components/home/WhyLuxeStay.jsx";

function HomePage() {
  return (
    <div>
      <Hero />
      <FeaturedDestinations />
      <WhyLuxeStay />
    </div>
  );
}

export default HomePage;

