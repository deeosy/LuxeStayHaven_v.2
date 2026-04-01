import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { searchRates } from "../utils/api.js";
import useSearchStore from "../stores/useSearchStore.js";
import useBookingStore from "../stores/useBookingStore.js";
import ImageGallery from "../components/hotel/ImageGallery.jsx";
import HotelInfo from "../components/hotel/HotelInfo.jsx";
import RoomList from "../components/hotel/RoomList.jsx";
import BookingSidebar from "../components/hotel/BookingSidebar.jsx";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function HotelDetailsPage() {
  const { hotelId } = useParams();
  const query = useQuery();
  const { adults, environment, setDates, setAdults } = useSearchStore();
  const { setSelectedHotel, setSelectedOffer } = useBookingStore();

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
        setSelectedHotel(data.hotelInfo || {});
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
  }, [hotelId, query, environment, setDates, setAdults, adults, setSelectedHotel]);

  const handleSelectOffer = (offer) => {
    setSelectedOffer(offer);
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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <ImageGallery hotelInfo={hotelInfo} />
              <HotelInfo hotelInfo={hotelInfo} />
              <RoomList rateInfo={rateInfo} onSelectOffer={handleSelectOffer} />
            </div>
            <div className="lg:sticky lg:top-20 h-fit">
              <BookingSidebar />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default HotelDetailsPage;

