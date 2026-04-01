import { create } from "zustand";

const useBookingStore = create((set) => ({
  selectedHotel: null,
  selectedOffer: null,
  prebookData: null,
  guestDetails: {
    firstName: "",
    lastName: "",
    email: ""
  },
  bookingConfirmation: null,
  step: "details",

  setSelectedHotel: (selectedHotel) => set({ selectedHotel }),
  setSelectedOffer: (selectedOffer) => set({ selectedOffer }),
  setPrebookData: (prebookData) => set({ prebookData }),
  setGuestDetails: (guestDetails) => set({ guestDetails }),
  setBookingConfirmation: (bookingConfirmation) =>
    set({ bookingConfirmation }),
  setStep: (step) => set({ step }),
  resetCheckout: () =>
    set({
      selectedOffer: null,
      prebookData: null,
      guestDetails: { firstName: "", lastName: "", email: "" },
      bookingConfirmation: null,
      step: "details"
    })
}));

export default useBookingStore;

