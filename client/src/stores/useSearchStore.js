import { create } from "zustand";

const defaultEnvironment = import.meta.env.PROD ? "production" : "sandbox";

const useSearchStore = create((set) => ({
  searchMode: "destination",
  placeId: null,
  destinationName: "",
  countryCode: "",
  aiSearchQuery: "",
  checkin: "",
  checkout: "",
  adults: 2,
  occupancies: [{ adults: 2, children: 0 }],
  environment: defaultEnvironment,
  searchResults: [],
  loading: false,
  error: null,

  setSearchMode: (mode) => set({ searchMode: mode }),
  setDestination: ({ placeId, destinationName, countryCode }) =>
    set({
      placeId: placeId ?? null,
      destinationName: destinationName ?? "",
      countryCode: countryCode ?? ""
    }),
  setAiSearchQuery: (aiSearchQuery) => set({ aiSearchQuery }),
  setDates: ({ checkin, checkout }) => set({ checkin, checkout }),
  setAdults: (adults) => set({ adults }),
  setOccupancies: (occupancies) => set({ occupancies }),
  setEnvironment: (environment) => set({ environment }),

  setSearchResults: (results) => set({ searchResults: results }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export default useSearchStore;
