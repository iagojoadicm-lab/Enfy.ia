import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans]
      },
      colors: {
        brand: {
          50: "#f3f6ff",
          100: "#e3e9ff",
          500: "#3556ff",
          600: "#2b45d1",
          700: "#2133c4"
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
