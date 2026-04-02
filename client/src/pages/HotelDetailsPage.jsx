import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { searchRates } from "../utils/api.js";
import useSearchStore from "../stores/useSearchStore.js";
import useBookingStore from "../stores/useBookingStore.js";
import ImageGallery from "../components/hotel/ImageGallery.jsx";
import HotelInfo from "../components/hotel/HotelInfo.jsx";
import RoomList from "../components/hotel/RoomList.jsx";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}


function HotelDetailsPage() {
  const { hotelId } = useParams();
  const query = useQuery();
  const navigate = useNavigate();
  const { adults, environment, checkin, checkout, setDates, setAdults } =
    useSearchStore();
  const { resetCheckout, setSelectedHotel, setSelectedOffer, setStep } =
    useBookingStore();

  const [hotelInfo, setHotelInfo] = useState(null);
  const [rateInfo, setRateInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkin = query.get("checkin") || "";
    const checkout = query.get("checkout") || "";
    const adultsFromQuery = Number(query.get("adults") || adults || 2);
    if (checkin && checkout) {
      setDates({ checkin, checkout });
    }
    setAdults(adultsFromQuery);

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchRates({
      checkin,
      checkout,
      adults: adultsFromQuery,
      hotelId,
      environment
    })
      .then((data) => {
        if (cancelled) return;
        setHotelInfo(data.hotelInfo || {});
        setRateInfo(data.rateInfo || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load hotel details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId, query, environment, setDates, setAdults, adults]);

  const resolvedCheckin = useMemo(
    () => query.get("checkin") || checkin || "",
    [query, checkin]
  );
  const resolvedCheckout = useMemo(
    () => query.get("checkout") || checkout || "",
    [query, checkout]
  );
  const resolvedAdults = useMemo(
    () => Number(query.get("adults") || adults || 2),
    [query, adults]
  );

  const handleProceedToCheckout = (offer) => {
    const offerId = offer?.offerId;
    if (!offerId) {
      setError("Missing offerId for this rate.");
      return;
    }

    if (!resolvedCheckin || !resolvedCheckout) {
      setError("Missing check-in/check-out dates. Please go back and search again.");
      return;
    }

    resetCheckout();
    setSelectedHotel({ ...hotelInfo, hotelId });
    setSelectedOffer({ ...offer, offerId, hotelId });
    setStep("details");

    navigate(
      `/checkout?hotelId=${encodeURIComponent(hotelId)}&offerId=${encodeURIComponent(
        offerId
      )}&checkin=${encodeURIComponent(resolvedCheckin)}&checkout=${encodeURIComponent(
        resolvedCheckout
      )}&adults=${encodeURIComponent(String(resolvedAdults))}&environment=${encodeURIComponent(
        environment || "sandbox"
      )}`
    );
  };

  return (
    <section className="bg-background py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && (
          <div className="text-sm text-textMedium">Loading hotel details…</div>
        )}
        {!loading && error && (
          <div className="rounded-xl bg-white border border-error/20 p-4 text-sm text-error">
            {error}
          </div>
        )}
        {!loading && !error && hotelInfo && (
          <div className="space-y-6">
            <ImageGallery hotelInfo={hotelInfo} />
            <HotelInfo hotelInfo={hotelInfo} />
            <RoomList rateInfo={rateInfo} onSelectOffer={handleProceedToCheckout} />
          </div>
        )}
      </div>
    </section>
  );
}

export default HotelDetailsPage;
