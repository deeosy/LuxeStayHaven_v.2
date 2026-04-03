import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "../../utils/analytics.js";

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = initAnalytics();
    if (!ok) return;

    trackPageView({
      path: `${location.pathname}${location.search}`,
      title: document.title,
      locationHref: window.location.href
    });
  }, [location.pathname, location.search]);

  return null;
}

export default AnalyticsTracker;

