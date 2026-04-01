/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B2A4A",
        accent: "#C9A96E",
        accentAlt: "#D4AF37",
        background: "#FAFAF8",
        textDark: "#1A1A2E",
        textMedium: "#4A4A68",
        textLight: "#8E8EA0",
        success: "#2E7D32",
        error: "#C62828",
        warning: "#F57C00"
      },
      fontFamily: {
        heading: ['"Playfair Display"', "serif"],
        body: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.15)"
      }
    }
  },
  plugins: []
};

