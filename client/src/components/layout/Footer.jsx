import React from "react";
import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200/60 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="font-heading text-lg text-primary">
            LuxeStayHaven
          </div>
          <p className="text-textMedium mt-2">
            Curated luxury stays, handpicked for unforgettable journeys.
          </p>
        </div>
        <div className="flex gap-8">
          <div className="space-y-2">
            <div className="font-medium text-textDark">Company</div>
            <Link to="#" className="block text-textMedium hover:text-primary">
              About
            </Link>
            <Link to="#" className="block text-textMedium hover:text-primary">
              Contact
            </Link>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-textDark">Legal</div>
            <Link to="#" className="block text-textMedium hover:text-primary">
              Privacy Policy
            </Link>
            <Link to="#" className="block text-textMedium hover:text-primary">
              Terms
            </Link>
          </div>
        </div>
        <div className="space-y-3 md:text-right">
          <div className="font-medium text-textDark">Follow</div>
          <div className="flex md:justify-end gap-3 text-textMedium">
            <button className="hover:text-primary" aria-label="Instagram">
              IG
            </button>
            <button className="hover:text-primary" aria-label="Twitter">
              X
            </button>
            <button className="hover:text-primary" aria-label="Facebook">
              FB
            </button>
          </div>
          <p className="text-xs text-textLight">
            © {year} LuxeStayHaven. All rights reserved.
          </p>
        </div>
      </div>
      <div className="pb-6 text-center">
        <a
          href="https://liteapi.travel"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-textLight hover:text-primary"
        >
          Powered by LiteAPI
        </a>
      </div>
    </footer>
  );
}

export default Footer;
