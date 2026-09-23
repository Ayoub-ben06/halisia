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
        background: "#111412",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#c9a84c",
          foreground: "#111412",
          glow: "rgba(201, 168, 76, 0.1)",
        },
        secondary: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          foreground: "rgba(255, 255, 255, 0.6)",
        },
        muted: {
          DEFAULT: "#1a1c1a",
          foreground: "rgba(255, 255, 255, 0.6)",
        },
        card: {
          DEFAULT: "#1a1c1a",
          foreground: "#FFFFFF",
        },
        border: "rgba(255, 255, 255, 0.05)",
        input: "rgba(255, 255, 255, 0.05)",
        ring: "#c9a84c",
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#1a1c1a",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "rgba(201, 168, 76, 0.1)",
          foreground: "#c9a84c",
        },
        halal: {
          compliant: "#10b981",
          debated: "#f59e0b",
          nonCompliant: "#ef4444",
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
