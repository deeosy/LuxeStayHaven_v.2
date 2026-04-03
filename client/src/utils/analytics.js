let hasInitialized = false;

function getMeasurementId() {
  return String(import.meta.env.VITE_GA4_ID || "").trim();
}

function ensureGtagStub() {
  if (typeof window === "undefined") return;
  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

export function initAnalytics() {
  if (typeof window === "undefined") return false;
  const id = getMeasurementId();
  if (!id) return false;
  if (hasInitialized) return true;
  hasInitialized = true;

  ensureGtagStub();

  if (!document.querySelector(`script[data-ga4="gtag"][data-id="${id}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.dataset.ga4 = "gtag";
    script.dataset.id = id;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", id, {
    send_page_view: false
  });

  return true;
}

export function trackEvent(name, params) {
  if (typeof window === "undefined") return;
  const id = getMeasurementId();
  if (!id) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params || {});
}

export function trackPageView({ path, title, locationHref }) {
  trackEvent("page_view", {
    page_path: path,
    page_title: title,
    page_location: locationHref
  });
}

export function trackOnce(key, name, params) {
  if (typeof window === "undefined") return;
  const storageKey = `ga4_once:${key}`;
  try {
    if (window.sessionStorage.getItem(storageKey) === "1") return;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {}
  trackEvent(name, params);
}

