import { create } from "zustand";

const useSearchStore = create((set) => ({
  searchMode: "destination",
  placeId: null,
  destinationName: "",
  aiSearchQuery: "",
  checkin: "",
  checkout: "",
  adults: 2,
  environment: "sandbox",
  searchResults: [],
  loading: false,
  error: null,

  setSearchMode: (mode) => set({ searchMode: mode }),
  setDestination: ({ placeId, destinationName }) =>
    set({ placeId, destinationName }),
  setAiSearchQuery: (aiSearchQuery) => set({ aiSearchQuery }),
  setDates: ({ checkin, checkout }) => set({ checkin, checkout }),
  setAdults: (adults) => set({ adults }),
  setEnvironment: (environment) => set({ environment }),

  setSearchResults: (results) => set({ searchResults: results }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export default useSearchStore;

