import { Suspense } from "react";
import type { Metadata } from "next";
import { PresentationView } from "@/components/presentation-view";
import { PublicPage } from "@/components/public-page";
import { getPresentationByToken } from "@/lib/data";

export const metadata: Metadata = {
  title: "Rabisco Prévia",
  robots: { index: false, follow: false },
};

export default function Page({ params }: PageProps<"/p/[token]">) {
  return (
    <Suspense fallback={null}>
      <PresentationLoader params={params} />
    </Suspense>
  );
}

async function PresentationLoader({
  params,
}: Pick<PageProps<"/p/[token]">, "params">) {
  const { token } = await params;
  const presentation = await getPresentationByToken(token);

  // Uma apresentação só com stories também abre.
  if (
    !presentation ||
    (presentation.posts.length === 0 && presentation.stories.length === 0)
  ) {
    return (
      <PublicPage title="Esta prévia não existe ou foi removida">
        Confira se o link foi copiado completo ou peça um novo à Rabisco.
      </PublicPage>
    );
  }

  return <PresentationView presentation={presentation} />;
}
