import React from "react";
import { Helmet } from "react-helmet-async";
import Hero from "../components/home/Hero.jsx";
import FeaturedDestinations from "../components/home/FeaturedDestinations.jsx";
import WhyLuxeStay from "../components/home/WhyLuxeStay.jsx";

function HomePage() {
  return (
    <div>
      <Helmet>
        <title>LuxeStayHaven | Luxury Hotel Booking</title>
        <meta
          name="description"
          content="Discover extraordinary stays with LuxeStayHaven: handpicked luxury hotels, curated destinations, and a seamless booking experience."
        />
        <meta property="og:title" content="LuxeStayHaven | Luxury Hotel Booking" />
        <meta
          property="og:description"
          content="Handpicked luxury hotels, curated destinations, and seamless booking."
        />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LuxeStayHaven",
              url: typeof window !== "undefined" ? window.location.origin : "",
              potentialAction: {
                "@type": "SearchAction",
                target:
                  (typeof window !== "undefined" ? window.location.origin : "") +
                  "/search?city={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            },
            null,
            2
          )}
        </script>
      </Helmet>
      <Hero />
      <FeaturedDestinations />
      <WhyLuxeStay />
    </div>
  );
}

export default HomePage;
