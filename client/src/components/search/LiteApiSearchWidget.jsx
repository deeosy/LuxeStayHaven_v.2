import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SDK_URL = "https://components.liteapi.travel/v1.0/sdk.umd.js";
const DEFAULT_GOLD = "#D4AF37";

function normalizeLiteApiDomain(value) {
  let s = String(value || "").trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^https\/\//i, "");
  s = s.replace(/^\/+/, "");
  s = s.split("/")[0] || "";
  return s.trim();
}

function hexToRgb(hex) {
  const h = String(hex || "").trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function applyLiteApiWidgetTheme(goldColor) {
  const rgb = hexToRgb(goldColor) || { r: 212, g: 175, b: 55 };
  const light = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`;
  const styleId = "liteapi-widget-theme";
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement("style");
    el.id = styleId;
    document.head.appendChild(el);
  }
  el.textContent = `
.liteapi-search-widget .vc-blue{
  --vc-accent-200:${light};
  --vc-accent-500:${goldColor};
  --vc-accent-600:${goldColor};
}
.liteapi-search-widget .simple-typeahead-list{
  z-index:99999 !important;
}
.liteapi-search-widget .guests-popup{
  z-index:99999 !important;
}
.liteapi-search-widget .vc-popover-content-wrapper{
  z-index:99999 !important;
}
`;
}

function toISODate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dayAfterTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

function inferCountryCodeFromText(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  const last = s.split(",").pop()?.trim() || "";
  if (/^[A-Za-z]{2}$/.test(last)) return last.toUpperCase();
  const lowered = s.toLowerCase();
  if (lowered.includes("paris")) return "FR";
  if (lowered.includes("london")) return "GB";
  if (lowered.includes("new york") || lowered.includes("nyc")) return "US";
  if (lowered.includes("tokyo")) return "JP";
  if (lowered.includes("dubai")) return "AE";
  if (lowered.includes("bali")) return "ID";
  if (lowered.includes("ghana")) return "GH";
  return "";
}

function extractPlace(searchData) {
  const place = searchData?.place || searchData?.places?.[0] || null;
  if (!place || typeof place !== "object") return null;
  return place;
}

function getPlaceDescription(place) {
  return (
    place?.description ||
    place?.formattedAddress ||
    place?.displayName?.text ||
    place?.name ||
    ""
  );
}

function getPlaceId(place) {
  return (
    place?.place_id ||
    place?.placeId ||
    place?.id ||
    ""
  );
}

function getCountryCode(place) {
  const ac = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
  const country = ac.find(
    (c) => Array.isArray(c?.types) && c.types.includes("country")
  );
  const code = country?.shortText || country?.short_text || "";
  if (typeof code === "string" && /^[A-Za-z]{2}$/.test(code.trim())) {
    return code.trim().toUpperCase();
  }
  return inferCountryCodeFromText(getPlaceDescription(place));
}

function getCity(place) {
  const desc = getPlaceDescription(place);
  const first = desc.split(",")[0]?.trim() || "";
  return first || desc;
}

function decodeOccupancies(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {}
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {}
  try {
    return JSON.parse(atob(value));
  } catch {}
  return null;
}

function encodeOccupanciesBase64(value) {
  try {
    const json = JSON.stringify(value);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return "";
  }
}

function totalAdultsFromSearchData(searchData) {
  const direct = Number(searchData?.adults);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const occ =
    decodeOccupancies(searchData?.occupancies) ||
    decodeOccupancies(searchData?.occupancy) ||
    null;

  if (Array.isArray(occ)) {
    const sum = occ.reduce((acc, o) => acc + (Number(o?.adults) || 0), 0);
    if (sum > 0) return sum;
  }

  const rooms = Number(searchData?.rooms);
  if (Number.isFinite(rooms) && rooms > 0) return Math.max(2, rooms * 2);

  return 2;
}

function totalRoomsFromSearchData(searchData) {
  const direct = Number(searchData?.rooms);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const occ =
    decodeOccupancies(searchData?.occupancies) ||
    decodeOccupancies(searchData?.occupancy) ||
    null;
  if (Array.isArray(occ) && occ.length > 0) return occ.length;
  return 1;
}

function totalChildrenFromSearchData(searchData) {
  const direct = Number(searchData?.children);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const occ =
    decodeOccupancies(searchData?.occupancies) ||
    decodeOccupancies(searchData?.occupancy) ||
    null;
  if (!Array.isArray(occ)) return 0;
  return occ.reduce((acc, o) => {
    const rawChildren = o?.children;
    if (Array.isArray(rawChildren)) return acc + rawChildren.length;
    const rawAges = o?.childrenAges;
    if (Array.isArray(rawAges)) return acc + rawAges.length;
    if (typeof rawChildren === "number" && Number.isFinite(rawChildren)) {
      return acc + rawChildren;
    }
    if (typeof rawChildren === "string") {
      const n = Number(rawChildren);
      if (Number.isFinite(n)) return acc + n;
    }
    return acc;
  }, 0);
}

function loadLiteApiComponents() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.LiteAPI) return Promise.resolve(window.LiteAPI);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-liteapi-components="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.LiteAPI));
      existing.addEventListener("error", () => reject(new Error("Failed to load LiteAPI components SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.setAttribute("data-liteapi-components", "true");
    script.onload = () => resolve(window.LiteAPI);
    script.onerror = () => reject(new Error("Failed to load LiteAPI components SDK"));
    document.body.appendChild(script);
  });
}

function initLiteApiOnce(LiteAPI, { domain, publicKey }) {
  if (typeof window === "undefined") return;
  const key = "__LITEAPI_COMPONENTS_INIT__";
  const existing = window[key];
  if (existing?.initialized) return;
  window[key] = { initialized: true, domain: domain || "", publicKey: publicKey || "" };
  LiteAPI.init({ ...(domain ? { domain } : {}), ...(publicKey ? { publicKey } : {}) });
}

function LiteApiSearchWidget({
  goldColor = DEFAULT_GOLD,
  className = "",
  containerId = "lite-search-bar",
  publicKey,
  whiteLabelDomain,
  environment
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);
  const latestSearchRef = useRef(location.search);
  const resolvedId = useMemo(() => {
    const suffix = Math.random().toString(16).slice(2);
    return `${containerId}-${suffix}`;
  }, [containerId]);

  useEffect(() => {
    latestSearchRef.current = location.search;
  }, [location.search]);

  useEffect(() => {
    setReady(false);
    setErr(null);

    let cancelled = false;
    let instance = null;

    (async () => {
      try {
        const LiteAPI = await loadLiteApiComponents();
        if (cancelled) return;

        const el = document.getElementById(resolvedId);
        if (el) el.innerHTML = "";

        const resolvedDomainRaw =
          whiteLabelDomain || import.meta.env.VITE_LITEAPI_DOMAIN || "";
        const resolvedDomain = normalizeLiteApiDomain(resolvedDomainRaw);
        const resolvedPublicKey =
          publicKey || import.meta.env.VITE_LITEAPI_PUBLIC_KEY || "";

        if (typeof LiteAPI?.init === "function") {
          if (resolvedDomain) {
            initLiteApiOnce(LiteAPI, { domain: resolvedDomain });
          } else if (resolvedPublicKey) {
            if (
              resolvedPublicKey.startsWith("prod_") ||
              resolvedPublicKey.startsWith("sand_")
            ) {
              throw new Error(
                "Do not use private LiteAPI API keys (prod_/sand_) in the browser. For the Search Bar Widget, set VITE_LITEAPI_DOMAIN to your WhiteLabel domain (recommended)."
              );
            }
            initLiteApiOnce(LiteAPI, { publicKey: resolvedPublicKey });
          } else {
            throw new Error(
              "LiteAPI SearchBar requires initialization. Set VITE_LITEAPI_DOMAIN to your WhiteLabel domain (recommended), or provide a valid LiteAPI publicKey."
            );
          }
        }

        applyLiteApiWidgetTheme(goldColor);

        // This keeps the widget in our app (no LiteAPI WhiteLabel redirect).
        // Adjust goldColor to match your brand accent (default is Luxe gold: #D4AF37).
        const onSearchClick = (searchData) => {
          console.log("LiteAPI SearchBar onSearchClick:", searchData);

          const place = extractPlace(searchData);
          const checkin =
            searchData?.checkin || toISODate(searchData?.dates?.start) || tomorrowISO();
          const checkout =
            searchData?.checkout || toISODate(searchData?.dates?.end) || dayAfterTomorrowISO();
          const adults = totalAdultsFromSearchData(searchData);
          const rooms = totalRoomsFromSearchData(searchData);
          const children = totalChildrenFromSearchData(searchData);
          const occupanciesRaw =
            typeof searchData?.occupancies === "string" ? searchData.occupancies : "";

          const params = new URLSearchParams(latestSearchRef.current || "");
          params.set("checkin", checkin);
          params.set("checkout", checkout);
          params.set("adults", String(adults));
          params.set("rooms", String(rooms));
          params.set("children", String(children));
          if (occupanciesRaw) {
            params.set("occupancies", occupanciesRaw);
          } else if (rooms > 1 || children > 0) {
            const generated = encodeOccupanciesBase64(
              Array.from({ length: rooms }, () => ({ adults: 2, children: 0 }))
            );
            if (generated) params.set("occupancies", generated);
          }

          if (environment) params.set("environment", environment);

          if (place) {
            const placeId = getPlaceId(place);
            const city = getCity(place);
            const cc = getCountryCode(place);

            if (placeId) params.set("placeId", placeId);
            if (city) params.set("city", city);
            if (cc) params.set("countryCode", cc);
          }

          setTimeout(() => {
            navigate(`/search?${params.toString()}`);
          }, 0);
        };

        if (!LiteAPI?.SearchBar?.create) {
          throw new Error("LiteAPI.SearchBar.create is not available");
        }

        instance = LiteAPI.SearchBar.create({
          selector: `#${resolvedId}`,
          primaryColor: goldColor,
          labelsOverride: {
            searchAction: "Search",
            placePlaceholderText: "Enter a destination"
          },
          onSearchClick
        });

        setReady(true);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load LiteAPI SearchBar");
      }
    })();

    return () => {
      cancelled = true;
      try {
        instance?.destroy?.();
      } catch {}
    };
  }, [goldColor, navigate, resolvedId, whiteLabelDomain, environment]);

  return (
    <div
      className={[
        "liteapi-search-widget",
        "relative z-30 rounded-2xl bg-white/70 backdrop-blur shadow-soft p-2 sm:p-2.5",
        className
      ].join(" ")}
    >
      {!ready && !err && (
        <div className="px-3 py-4 text-sm text-textMedium">Loading search…</div>
      )}
      {err && (
        <div className="px-3 py-4 text-sm text-error">{err}</div>
      )}
      <div id={resolvedId} className="w-full" />
    </div>
  );
}

export default LiteApiSearchWidget;
