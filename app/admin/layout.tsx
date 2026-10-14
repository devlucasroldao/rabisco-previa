import type { Metadata, Viewport } from "next";
import { ThemeController } from "@/components/admin/shell/theme-controller";
import { THEME_SCRIPT } from "@/lib/admin-theme";
import { bodyFont, displayFont } from "./fonts";

export const metadata: Metadata = {
  title: "Rabisco Prévia",
  icons: {
    icon: [
      { url: "/brand/web/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/web/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/web/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/web/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/brand/web/apple-touch-icon.png", sizes: "180x180" },
  },
};

// Mesmos valores de --bg do theme.css (claro e escuro).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1715" },
  ],
};

// Vale pro login e pro painel. O script de tema roda antes de .admin ser
// pintado; o layout continua estático (nada aqui lê cookie nem sessão).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeController />
      <div className={`admin min-h-dvh ${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </div>
    </>
  );
}
