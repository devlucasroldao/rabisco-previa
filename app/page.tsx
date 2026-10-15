import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "Rabisco Prévia",
  robots: { index: false, follow: false },
};

export default function Home() {
  return (
    <PublicPage title="Boas-vindas à Rabisco Prévia">
      Abra o link da prévia que a Rabisco te enviou.
    </PublicPage>
  );
}
