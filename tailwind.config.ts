import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        choco: {
          50:  "#fdf9f6",
          100: "#f8eee6",
          200: "#edd6c3",
          300: "#dfb391",
          400: "#cf8b5c",
          500: "#b86a3f", // main accent
          600: "#964b2e",
          700: "#703526",
          800: "#4a2319",
          900: "#2b1510",
        },
        cream: {
          50: "#fefcf8",
          100: "#f9f3e7",
        },
      },
      fontFamily: {
        sans: ["system-ui", "Inter", "sans-serif"],
        display: ["system-ui", "Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
