import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "./components/layout/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import SearchResultsPage from "./pages/SearchResultsPage.jsx";
import HotelDetailsPage from "./pages/HotelDetailsPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" }
};

function App() {
  const location = useLocation();

  return (
    <Layout>
      <motion.div key={location.pathname} {...pageTransition}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/hotel/:hotelId" element={<HotelDetailsPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </motion.div>
    </Layout>
  );
}

export default App;

