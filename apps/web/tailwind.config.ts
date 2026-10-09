import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#0F766E",
          dark: "#115E59",
          light: "#CCFBF1",
          50: "#F0FDFA",
          100: "#CCFBF1",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        slate: {
          850: "#151F32",
          900: "#0F172A",
        },
        emergency: {
          DEFAULT: "#DC2626",
          dark: "#B91C1C",
          light: "#FEE2E2",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
