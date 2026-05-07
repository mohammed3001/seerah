import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
          disabled: "hsl(var(--accent-disabled) / <alpha-value>)",
          tint: "hsl(var(--accent-tint) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        // CV Lite spec: 8px is the default for buttons + cards + inputs;
        // 4px reserved for tags, 16px for hero feature containers.
        card: "8px",
        input: "8px",
        button: "8px",
        tag: "4px",
        hero: "16px",
      },
      boxShadow: {
        // CV Lite elevation scale (rgba(95,95,95,...) per spec).
        soft: "0 2px 8px rgba(95, 95, 95, 0.05)",
        card: "0 4px 15px rgba(95, 95, 95, 0.07)",
        elevated: "0 4px 15px rgba(95, 95, 95, 0.07)",
        prominent: "0 6px 20px rgba(95, 95, 95, 0.12)",
        deep: "0 8px 30px rgba(95, 95, 95, 0.15)",
        // Dark-mode equivalent kept for surfaces that opt into the dark
        // shadow explicitly (sidebar, command palette, etc.).
        "card-dark": "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
        // Focus ring for inputs (light blue glow).
        "focus-ring": "0 0 0 3px hsl(var(--accent) / 0.1)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "200": "200ms",
      },
      fontFamily: {
        "sf-pro": ["var(--font-sf-pro)", "system-ui", "sans-serif"],
        cairo: ["var(--font-cairo)", "system-ui", "sans-serif"],
        // CV Lite display face for headings + display text.  Manrope is
        // an open-source geometric sans that fills the role the spec
        // assigns to Gilroy Bold (which is a paid font).  Cairo retains
        // the Arabic side so RTL headings still render correctly.
        display: ["var(--font-display)", "var(--font-cairo)", "system-ui", "sans-serif"],
        sans: ["var(--font-sf-pro)", "var(--font-cairo)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-end": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(6deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        "slide-in-end": "slide-in-end 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 12s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/container-queries")],
};

export default config;
