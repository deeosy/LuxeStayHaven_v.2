import React, { Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Hero from "../components/home/Hero.jsx";
import WhyLuxeStay from "../components/home/WhyLuxeStay.jsx";

// Performance: defer non-critical homepage sections (below the fold).
const FeaturedDestinations = React.lazy(() => import("../components/home/FeaturedDestinations.jsx"));
const TrustSignals = React.lazy(() => import("../components/home/TrustSignals.jsx"));

function HomePage() {
  return (
    <div className="bg-background">
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
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"><div className="h-7 w-48 bg-slate-100 rounded" /><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="rounded-2xl bg-slate-100 h-[220px]" />))}</div></div>}>
        <FeaturedDestinations />
      </Suspense>
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"><div className="rounded-3xl bg-slate-100 h-[360px]" /></div>}>
        <TrustSignals />
      </Suspense>
      <WhyLuxeStay />
    </div>
  );
}

export default HomePage;
