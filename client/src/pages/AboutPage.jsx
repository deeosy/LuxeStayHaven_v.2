import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button.jsx";

function AboutPage() {
  const title = "About LuxeStayHaven | Curated Luxury Hotel Booking";
  const description =
    "LuxeStayHaven is a minimalist luxury hotel booking experience—curated stays, transparent pricing, and secure checkout powered by LiteAPI.";

  return (
    <section className="bg-background py-12 sm:py-16">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white/70 backdrop-blur border border-slate-100 shadow-soft p-8 sm:p-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-textLight">
              About
            </p>
            <h1 className="mt-2 font-heading text-3xl sm:text-5xl text-primary leading-tight">
              About LuxeStayHaven
            </h1>
            <p className="mt-4 text-sm sm:text-base text-textMedium leading-relaxed">
              A calm, premium way to book exceptional stays—built for travelers
              who value clarity, comfort, and confidence.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-6 sm:p-7">
              <h2 className="font-heading text-xl text-primary">Our story</h2>
              <p className="mt-3 text-sm text-textMedium leading-relaxed">
                LuxeStayHaven was designed to feel effortless: curated luxury
                hotels, transparent pricing, and a booking flow that stays
                focused. No clutter—just the details that matter.
              </p>
              <p className="mt-3 text-sm text-textMedium leading-relaxed">
                We partner with trusted travel infrastructure so you can browse,
                compare, and confirm with confidence.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-6 sm:p-7">
              <h2 className="font-heading text-xl text-primary">Mission</h2>
              <p className="mt-3 text-sm text-textMedium leading-relaxed">
                To elevate the booking experience—bringing premium stays within
                reach through clear rates, modern filters, and secure checkout.
              </p>
              <div className="mt-5 rounded-xl bg-background border border-slate-100 p-4 text-xs text-textMedium">
                Secure checkout powered by LiteAPI.
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="font-heading text-2xl text-primary">Why choose us</h2>
            <p className="mt-2 text-sm text-textMedium">
              Premium stays, delivered with simplicity and trust.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Transparent pricing",
                  desc: "Clear totals and policies—no surprises.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M8 10h8M8 14h8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3z" />
                    </svg>
                  )
                },
                {
                  title: "Secure checkout",
                  desc: "Payments and booking flows powered by LiteAPI.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.3l1.8 1.8 3.8-4" />
                    </svg>
                  )
                },
                {
                  title: "Handpicked hotels",
                  desc: "A refined selection of premium properties.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10V7a2 2 0 012-2h12a2 2 0 012 2v3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10v10h12V10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6" />
                    </svg>
                  )
                },
                {
                  title: "24/7 support",
                  desc: "Assistance when you need it, worldwide.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0116 0v4a2 2 0 01-2 2h-1" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v4a2 2 0 002 2h1" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8" />
                    </svg>
                  )
                }
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-white border border-slate-100 shadow-soft p-5">
                  <div className="text-accent">{item.icon}</div>
                  <div className="mt-3 font-medium text-textDark">{item.title}</div>
                  <div className="mt-1 text-xs text-textMedium leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2 items-start">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-soft p-6 sm:p-7">
              <h2 className="font-heading text-xl text-primary">Values</h2>
              <div className="mt-4 grid gap-3">
                {[
                  { k: "Clarity", v: "Transparent rates and policies." },
                  { k: "Taste", v: "A curated selection of luxury stays." },
                  { k: "Trust", v: "Secure checkout and dependable infrastructure." }
                ].map((row) => (
                  <div key={row.k} className="flex items-start justify-between gap-4 text-sm">
                    <div className="text-textDark font-medium">{row.k}</div>
                    <div className="text-textMedium">{row.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-background border border-slate-100 p-6 sm:p-7">
              <h2 className="font-heading text-xl text-primary">Start exploring</h2>
              <p className="mt-3 text-sm text-textMedium leading-relaxed">
                Discover premium hotels and confirm your next stay in minutes.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link to="/" className="w-full sm:w-auto">
                  <Button type="button" className="w-full">
                    Start exploring luxury stays
                  </Button>
                </Link>
                <Link to="/search" className="w-full sm:w-auto">
                  <Button type="button" variant="secondary" className="w-full">
                    Browse hotels
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutPage;

