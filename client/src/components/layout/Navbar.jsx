import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useSearchStore from "../../stores/useSearchStore.js";

function Navbar() {
  const { environment, setEnvironment } = useSearchStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          <div className="flex items-center gap-5 text-xs text-white/90">
            <Link to="/" className="hover:text-accent transition">
              Home
            </Link>
            <Link to="/search" className="hover:text-accent transition">
              Hotels
            </Link>
            <a href="/#destinations" className="hover:text-accent transition">
              Destinations
            </a>
            <a href="/#about" className="hover:text-accent transition">
              About
            </a>
            <Link to="/confirmation" className="hover:text-accent transition">
              My Bookings
            </Link>
          </div>

          {import.meta.env.DEV && (
            <div className="flex items-center gap-2 text-xs">
              <span className="uppercase tracking-wide text-white/70">Env:</span>
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
          )}
        </div>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="sr-only">Menu</span>
          <span className="block h-0.5 w-4 bg-white/90" />
          <span className="block h-0.5 w-4 bg-white/90 mt-1" />
          <span className="block h-0.5 w-4 bg-white/90 mt-1" />
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-primary/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 text-xs text-white/90">
            <Link to="/" className="hover:text-accent transition" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link
              to="/search"
              className="hover:text-accent transition"
              onClick={() => setMenuOpen(false)}
            >
              Hotels
            </Link>
            <a
              href="/#destinations"
              className="hover:text-accent transition"
              onClick={() => setMenuOpen(false)}
            >
              Destinations
            </a>
            <a
              href="/#about"
              className="hover:text-accent transition"
              onClick={() => setMenuOpen(false)}
            >
              About
            </a>
            <Link
              to="/confirmation"
              className="hover:text-accent transition"
              onClick={() => setMenuOpen(false)}
            >
              My Bookings
            </Link>

            {import.meta.env.DEV && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="uppercase tracking-wide text-white/70 text-[10px]">
                  Environment
                </div>
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
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
