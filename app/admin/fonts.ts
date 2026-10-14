import { Hanken_Grotesk, Open_Sans } from "next/font/google";

// Fontes do painel. As variáveis entram em .admin e o theme.css monta
// --font-sans e --font-display a partir delas.

export const bodyFont = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-brand-sans",
});

// Substituta da HK Sentiments (veja o comentário de --font-display em
// app/admin/theme.css pra trocar por next/font/local).
export const displayFont = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-brand-display",
});
