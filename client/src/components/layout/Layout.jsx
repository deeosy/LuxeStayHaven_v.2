import React, { useEffect, useState } from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

function Layout({ children }) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Show a minimal Back-to-top button after the user scrolls down.
  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-soft hover:shadow-xl transition"
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}

export default Layout;
