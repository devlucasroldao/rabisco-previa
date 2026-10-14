import { MEDIA_BUCKET } from "./media";
import { getSupabaseBrowser } from "./supabase/browser";
import { getSupabasePublicEnv } from "./supabase/env";

// Só roda no navegador. O arquivo vai direto pro Storage com a sessão da
// equipe: as funções da Vercel limitam o corpo da requisição a ~4,5 MB.
//
// Usa XMLHttpRequest porque o upload do supabase-js não informa o progresso.
export async function uploadToBucket(
  path: string,
  body: Blob,
  contentType: string,
  { upsert = false, onProgress }: {
    upsert?: boolean;
    onProgress?: (fraction: number) => void;
  } = {},
): Promise<void> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sua sessão expirou. Entre de novo.");

  const env = getSupabasePublicEnv();
  const url = `${env.url}/storage/v1/object/${MEDIA_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", env.anonKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", String(upsert));
    xhr.setRequestHeader("cache-control", "max-age=3600");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      let message = `erro ${xhr.status}`;
      try {
        message = JSON.parse(xhr.responseText).message ?? message;
      } catch {
        // Resposta sem JSON: fica o status.
      }
      reject(new Error(`O envio falhou: ${message}`));
    };
    xhr.onerror = () => reject(new Error("O envio falhou. Confira a conexão."));
    xhr.send(body);
  });
}

export async function removeFromBucket(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await getSupabaseBrowser().storage.from(MEDIA_BUCKET).remove(paths);
}
