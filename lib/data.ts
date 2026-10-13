import { samplePresentations } from "./sample-data";
import type { Presentation } from "./types";

// Único ponto de leitura da tela do cliente. Na Etapa 2 o corpo passa a
// consultar o Supabase pelo token; a assinatura e o formato de retorno ficam.
export async function getPresentationByToken(
  token: string,
): Promise<Presentation | null> {
  const presentation = samplePresentations.find((p) => p.token === token);
  if (!presentation) return null;

  return {
    ...presentation,
    posts: [...presentation.posts].sort((a, b) => a.position - b.position),
  };
}
