import {
  Cairo,
  Cormorant_Garamond,
  DM_Sans,
  Inter,
  JetBrains_Mono,
  Jost,
  Montserrat,
  Plus_Jakarta_Sans,
} from "next/font/google";

/**
 * Apple's "SF Pro Display" is not licensed for free web use, so we use Inter
 * — the de-facto open-source equivalent — as the primary Latin face. The CSS
 * variable name preserves the design intent.
 */
export const sfPro = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sf-pro",
  weight: ["400", "500", "600", "700"],
});

export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
});

/* -------------------------------------------------------------------------- */
/*  Premium template typefaces                                                */
/* -------------------------------------------------------------------------- */
/*  Every face below is consumed exclusively by the premium template          */
/*  family in `apps/web/src/templates/`. They are exposed as CSS variables    */
/*  on the root <html> so both the in-editor preview and the headless        */
/*  /render/[id] route resolve them without an external Google Fonts <link>  */
/*  request (the SSRF guard in services/pdf only allow-lists the app host).  */

/** Serif used by Executive Dark + Elegant Serif. */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

/** Geometric sans used by Creative Sidebar + Tech Developer. */
export const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

/** Display sans used by Executive Dark for taglines + meta. */
export const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

/** Monospaced face for Tech Developer terminal-style accents. */
export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

/** Soft humanist sans paired with Elegant Serif for body lists. */
export const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
  weight: ["400", "500", "600", "700"],
});

/** Compact display sans used by Compact One Page. */
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

/** All premium-template font CSS-variable class names, joined for layouts. */
export const premiumFontClassNames = [
  cormorant.variable,
  dmSans.variable,
  montserrat.variable,
  jetBrainsMono.variable,
  jost.variable,
  plusJakarta.variable,
].join(" ");
