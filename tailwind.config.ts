import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1E1B4B",
        brand: "#4338CA",
        canvas: "#FAFAF9",
      },
      boxShadow: {
        float: "0 12px 35px rgba(28,25,23,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
