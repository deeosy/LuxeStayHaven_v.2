import React from "react";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;

