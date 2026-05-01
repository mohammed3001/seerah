import { Cairo, Inter } from "next/font/google";

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
