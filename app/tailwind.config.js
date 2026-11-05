/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        brand: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81", 950: "#1e1b4b" },
        gold: { 300: "#f3dc95", 400: "#e6c65a", 500: "#d4a937", 600: "#b08a22" },
      },
      boxShadow: { glow: "0 0 0 1px rgb(99 102 241 / .25), 0 8px 30px -12px rgb(99 102 241 / .45)" },
      keyframes: { "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } } },
      animation: { "fade-in": "fade-in .18s ease-out" },
    },
  },
  plugins: [],
};
