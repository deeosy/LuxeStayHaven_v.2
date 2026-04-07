import React from "react";

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200/60 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center space-y-2">
        <div className="text-[11px] text-textLight">
          <a
            href="https://liteapi.travel"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary"
          >
            Powered by LiteAPI
          </a>
        </div>
        <div className="text-[11px] text-textLight">
          © {year} LuxeStayHaven. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
