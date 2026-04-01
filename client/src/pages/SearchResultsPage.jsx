import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useSearchStore from "../stores/useSearchStore.js";
import { searchHotels } from "../utils/api.js";
import SearchResults from "../components/search/SearchResults.jsx";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function SearchResultsPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const {
    searchResults,
    setSearchResults,
    loading,
    setLoading,
    error,
    setError,
    setDestination,
    setDates,
    setAdults,
    environment
  } = useSearchStore();

  useEffect(() => {
    const city = query.get("city");
    const countryCode = query.get("countryCode") || "US";
    const checkin = query.get("checkin") || "";
    const checkout = query.get("checkout") || "";
    const adults = Number(query.get("adults") || 2);

    if (!city || !checkin || !checkout) return;

    setDestination({ placeId: null, destinationName: `${city}, ${countryCode}` });
    setDates({ checkin, checkout });
    setAdults(adults);

    let cancelled = false;
    setLoading(true);
    setError(null);
    searchHotels({
      checkin,
      checkout,
      adults,
      city,
      countryCode: countryCode.toUpperCase() || "FR",
      environment
    })
      .then((data) => {
        if (cancelled) return;
        setSearchResults(data.rates || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load hotels");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    query,
    environment,
    setSearchResults,
    setLoading,
    setError,
    setDestination,
    setDates,
    setAdults
  ]);

  const handleModifySearch = () => {
    navigate("/");
  };

  return (
    <SearchResults
      results={searchResults}
      loading={loading}
      error={error}
      onModifySearch={handleModifySearch}
    />
  );
}

export default SearchResultsPage;

