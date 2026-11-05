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
        /* colores por variables: los cambia el tema elegido (ver src/lib/appearance.ts) */
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(k => [k, `rgb(var(--b-${k}) / <alpha-value>)`])),
        slate: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(k => [k, `rgb(var(--n-${k}) / <alpha-value>)`])),
        gold: { 300: "#f3dc95", 400: "#e6c65a", 500: "#d4a937", 600: "#b08a22" },
      },
      boxShadow: { glow: "0 0 0 1px rgb(var(--b-500) / .25), 0 8px 30px -12px rgb(var(--b-500) / .45)" },
      keyframes: { "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } } },
      animation: { "fade-in": "fade-in .18s ease-out" },
    },
  },
  plugins: [],
};
