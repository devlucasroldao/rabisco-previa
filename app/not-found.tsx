import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "Rabisco Prévia",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PublicPage title="Página não encontrada">
      Confira o endereço ou abra o link da prévia que a Rabisco te enviou.
    </PublicPage>
  );
}
