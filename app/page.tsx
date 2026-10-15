import type { Metadata } from "next";
import { PhoneMockup } from "@/components/phone-mockup";
import { PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "Rabisco Prévia",
  robots: { index: false, follow: false },
};

export default function Home() {
  return (
    <PublicPage title="Boas-vindas à Rabisco Prévia" aside={<PhoneMockup />}>
      <p>Abra o link da prévia que a Rabisco te enviou.</p>
      <p className="flex items-baseline gap-3">
        <span aria-hidden="true" className="h-0.5 w-6 shrink-0 translate-y-[-0.3em] bg-pub-dot" />
        Veja como seus posts vão ficar antes de publicar.
      </p>
    </PublicPage>
  );
}
