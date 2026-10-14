import { Suspense } from "react";
import { Message } from "@/components/message";
import { PresentationView } from "@/components/presentation-view";
import { getPresentationByToken } from "@/lib/data";

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
    return <Message title="Esta prévia não existe ou foi removida" />;
  }

  return <PresentationView presentation={presentation} />;
}
