import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import useSearchStore from "../stores/useSearchStore.js";
import { searchHotels } from "../utils/api.js";
import HotelCard from "../components/search/HotelCard.jsx";

function formatISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTitleCase(value) {
  return String(value || "")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function slugToCityKey(slug) {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "newyork") return "new-york";
  return s;
}

const CITY_MAP = {
  paris: {
    city: "Paris",
    countryCode: "FR",
    heroImage:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "Paris pairs timeless architecture with modern indulgence — from riverside walks along the Seine to candlelit dining in the 7th arrondissement. Explore refined hotels near iconic landmarks, couture shopping, and world-class museums."
  },
  "new-york": {
    city: "New York",
    countryCode: "US",
    heroImage:
      "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "New York is a city of constant momentum — skyline views, Michelin-starred dining, Broadway nights, and neighborhood charm. Discover luxury stays across Manhattan and beyond, curated for comfort and effortless access."
  },
  tokyo: {
    city: "Tokyo",
    countryCode: "JP",
    heroImage:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "Tokyo blends sleek design with quiet tradition — rooftop views, hidden omakase counters, and serene gardens moments from the city’s brightest districts. Choose a premium stay that matches your pace."
  },
  dubai: {
    city: "Dubai",
    countryCode: "AE",
    heroImage:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "Dubai is modern luxury at its most spectacular — skyline icons, desert escapes, and pristine beaches. Explore high-end hotels with resort amenities, sweeping views, and world-class service."
  },
  rome: {
    city: "Rome",
    countryCode: "IT",
    heroImage:
      "https://images.unsplash.com/photo-1529154036614-a60975f5c760?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "Rome is an open-air masterpiece — ancient streets, espresso mornings, and golden-hour piazzas. Find elegant hotels near historic sights, romantic neighborhoods, and exceptional dining."
  },
  bali: {
    city: "Bali",
    countryCode: "ID",
    heroImage:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "Bali offers tranquil escapes — lush landscapes, spa rituals, and beachside sunsets. Discover luxury resorts and boutique retreats designed for rest, romance, and renewal."
  },
  london: {
    city: "London",
    countryCode: "GB",
    heroImage:
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "London is classic and contemporary — royal parks, galleries, and acclaimed restaurants alongside modern neighborhoods. Choose refined stays for seamless access to the city’s best."
  }
};

function buildCityMeta(citySlug) {
  const key = slugToCityKey(citySlug);
  if (CITY_MAP[key]) return { slug: key, ...CITY_MAP[key] };
  const parts = key
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);
  const fallbackCity = toTitleCase(parts.join(" "));
  return {
    slug: key,
    city: fallbackCity || "Destination",
    countryCode: "",
    heroImage:
      "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=2400&q=80",
    blurb:
      "Discover beautifully curated stays, transparent rates, and seamless booking with LuxeStayHaven."
  };
}

function CityLandingPage() {
  const { citySlug } = useParams();
  const { environment } = useSearchStore();
  const cityMeta = useMemo(() => buildCityMeta(citySlug), [citySlug]);

  const buttonBase =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed";
  const buttonPrimary = `${buttonBase} bg-accent text-white shadow-soft hover:bg-accentAlt`;
  const buttonSecondary = `${buttonBase} border border-primary/20 bg-white text-primary hover:bg-primary/5`;

  const dates = useMemo(() => {
    const base = new Date();
    const checkin = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    const checkout = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 4);
    return { checkin: formatISO(checkin), checkout: formatISO(checkout) };
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rates, setRates] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setRates([]);

    if (!cityMeta.city || !cityMeta.countryCode) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    searchHotels({
      city: cityMeta.city,
      countryCode: cityMeta.countryCode,
      checkin: dates.checkin,
      checkout: dates.checkout,
      adults: 2,
      environment
    })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.rates) ? data.rates : [];
        setRates(list.slice(0, 9));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load hotels");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityMeta.city, cityMeta.countryCode, dates.checkin, dates.checkout, environment]);

  const canonicalUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/destinations/${encodeURIComponent(cityMeta.slug)}`;
  }, [cityMeta.slug]);

  const searchAllHref = useMemo(() => {
    if (!cityMeta.countryCode) return "/search";
    const params = new URLSearchParams();
    params.set("city", cityMeta.city);
    params.set("countryCode", cityMeta.countryCode);
    params.set("checkin", dates.checkin);
    params.set("checkout", dates.checkout);
    params.set("adults", "2");
    params.set("environment", environment || "sandbox");
    return `/search?${params.toString()}`;
  }, [cityMeta.city, cityMeta.countryCode, dates.checkin, dates.checkout, environment]);

  const title = `Best Luxury Hotels in ${cityMeta.city} 2026 | LuxeStayHaven`;
  const description = `Discover luxury hotels in ${cityMeta.city} with transparent rates and seamless booking. Compare top stays, refine by stars and refundable options, and book with confidence.`;

  const jsonLd = useMemo(() => {
    // SEO strategy:
    // - Canonical destination URLs avoid query params and concentrate ranking signals.
    // - BreadcrumbList helps Google understand site hierarchy.
    // - CollectionPage + ItemList provides structured "top hotels" content.
    if (!canonicalUrl) return null;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const itemList = rates.map((r, idx) => {
      const h = r?.hotel || {};
      const hotelUrl = `${base}/hotel/${encodeURIComponent(h?.id || r?.hotelId)}?checkin=${encodeURIComponent(
        dates.checkin
      )}&checkout=${encodeURIComponent(dates.checkout)}&adults=2&environment=${encodeURIComponent(
        environment || "sandbox"
      )}`;

      return {
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Hotel",
          name: h?.name || "Hotel",
          url: hotelUrl,
          image: h?.main_photo || undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: h?.address || undefined,
            addressLocality: cityMeta.city,
            addressCountry: cityMeta.countryCode || undefined
          },
          starRating:
            typeof (h?.stars ?? h?.starRating) === "number"
              ? {
                  "@type": "Rating",
                  ratingValue: h?.stars ?? h?.starRating
                }
              : undefined
        }
      };
    });

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${base}/`
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Destinations",
              item: `${base}/#destinations`
            },
            {
              "@type": "ListItem",
              position: 3,
              name: cityMeta.city,
              item: canonicalUrl
            }
          ]
        },
        {
          "@type": "CollectionPage",
          name: `Luxury Hotels in ${cityMeta.city}`,
          description,
          url: canonicalUrl,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: itemList
          }
        }
      ]
    };
  }, [
    canonicalUrl,
    cityMeta.city,
    cityMeta.countryCode,
    dates.checkin,
    dates.checkout,
    description,
    environment,
    rates
  ]);

  return (
    <section className="bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {cityMeta.heroImage && <meta property="og:image" content={cityMeta.heroImage} />}
        {jsonLd && (
          <script type="application/ld+json">{JSON.stringify(jsonLd, null, 2)}</script>
        )}
      </Helmet>

      <div className="relative">
        <div className="absolute inset-0">
          <img
            src={cityMeta.heroImage}
            alt={cityMeta.city}
            loading="lazy"
            decoding="async"
            sizes="100vw"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/30" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="max-w-2xl text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-white/90">
              Destination guide
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl leading-tight mt-2">
              Discover luxury hotels in {cityMeta.city}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-100/90">
              {cityMeta.blurb}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={searchAllHref} className={buttonPrimary}>
                Search all hotels
              </Link>
              <Link to="/#destinations" className={buttonSecondary}>
                Explore destinations
              </Link>
            </div>
            <div className="mt-6 text-[11px] text-slate-100/70">
              Dates: {dates.checkin} – {dates.checkout} · 2 adults
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-heading text-2xl text-primary">Top stays</h2>
            <p className="text-sm text-textMedium mt-1">
              Curated availability for {cityMeta.city}. Transparent rates powered by LiteAPI.
            </p>
          </div>
          <Link to={searchAllHref} className={`hidden sm:inline-flex ${buttonSecondary}`}>
            View all
          </Link>
        </div>

        {!cityMeta.countryCode && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-8 text-center">
            <div className="font-heading text-lg text-primary">Coming soon</div>
            <p className="mt-2 text-sm text-textMedium">
              This destination page isn’t available yet. Try searching for hotels instead.
            </p>
            <div className="mt-5 flex justify-center">
              <Link to="/search" className={buttonSecondary}>
                Search hotels
              </Link>
            </div>
          </div>
        )}

        {cityMeta.countryCode && loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-100 shadow-soft overflow-hidden"
              >
                <div className="aspect-[16/10] bg-slate-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  <div className="h-4 w-1/3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {cityMeta.countryCode && !loading && error && (
          <div className="rounded-2xl bg-white border border-error/20 shadow-soft p-6 text-sm text-error">
            {error}
          </div>
        )}

        {cityMeta.countryCode && !loading && !error && rates.length === 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-8 text-center space-y-3">
            <div className="font-heading text-lg text-primary">No hotels found</div>
            <p className="text-sm text-textMedium max-w-xl mx-auto">
              Try different dates or search all hotels in {cityMeta.city} for more options.
            </p>
            <div className="flex justify-center">
              <Link to={searchAllHref} className={buttonSecondary}>
                Search all hotels
              </Link>
            </div>
          </div>
        )}

        {cityMeta.countryCode && !loading && !error && rates.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rates.map((rate) => (
              <HotelCard
                key={rate.hotelId}
                rate={rate}
                searchParams={{
                  checkin: dates.checkin,
                  checkout: dates.checkout,
                  adults: 2,
                  environment: environment || "sandbox"
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CityLandingPage;
