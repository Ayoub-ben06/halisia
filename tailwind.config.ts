import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D1B2A",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#C9A84C",
          foreground: "#0D1B2A",
        },
        secondary: {
          DEFAULT: "#132236",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#132236",
          foreground: "#8A9BB0",
        },
        card: {
          DEFAULT: "#132236",
          foreground: "#FFFFFF",
        },
        border: "#1E3248",
        input: "#1E3248",
        ring: "#C9A84C",
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#132236",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#1E3248",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
