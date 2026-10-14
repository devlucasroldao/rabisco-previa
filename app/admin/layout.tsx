import type { Metadata, Viewport } from "next";
import { ThemeController } from "@/components/admin/shell/theme-controller";
import { THEME_SCRIPT } from "@/lib/admin-theme";
import { bodyFont, displayFont } from "../fonts";

// O favicon vem de app/icon.png e app/apple-icon.png e vale pra todas as rotas.
export const metadata: Metadata = { title: "Rabisco Prévia" };

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
