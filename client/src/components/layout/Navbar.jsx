import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useSearchStore from "../../stores/useSearchStore.js";

function Navbar() {
  const { environment, setEnvironment } = useSearchStore();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition backdrop-blur ${
        scrolled
          ? "bg-primary/80 shadow-soft"
          : "bg-gradient-to-b from-primary/70 to-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between text-white">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full border border-accent flex items-center justify-center text-xs font-semibold tracking-widest">
            LS
          </div>
          <div>
            <div className="font-heading text-lg leading-tight">
              LuxeStayHaven
            </div>
            <div className="text-[11px] text-accent/90">
              Discover extraordinary stays
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <button
            type="button"
            className={`relative flex items-center gap-2 rounded-full px-3 py-1 text-xs border border-white/20 bg-white/5`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Search</span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="uppercase tracking-wide text-white/70">
              Env:
            </span>
            <button
              type="button"
              onClick={() =>
                setEnvironment(
                  environment === "sandbox" ? "production" : "sandbox"
                )
              }
              className="flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5"
              aria-label="Toggle environment"
            >
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  environment === "sandbox"
                    ? "bg-white text-primary"
                    : "text-white/70"
                }`}
              >
                Sandbox
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  environment === "production"
                    ? "bg-white text-primary"
                    : "text-white/70"
                }`}
              >
                Prod
              </span>
            </button>
          </div>

          <Link
            to={location.pathname === "/checkout" ? "/" : "/checkout"}
            className="text-xs font-medium hover:text-accent transition"
          >
            My Bookings
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;

