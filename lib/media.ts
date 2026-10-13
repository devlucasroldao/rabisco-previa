// Regras de mídia compartilhadas entre o navegador (que redimensiona e envia)
// e o servidor (que confere o que chegou no bucket).

export const MEDIA_BUCKET = "media";

// Mesmo formato que a tela do cliente lê em posts.media.
export type StoredMedia = {
  path: string;
  kind: "image" | "video";
  poster?: string;
};

export type PostType = "post" | "carousel" | "reels";

export const POST_TYPE_LABELS: Record<PostType, string> = {
  post: "Post",
  carousel: "Carrossel",
  reels: "Reels",
};

export const TITLE_MAX_LENGTH = 80;
export const CAPTION_MAX_LENGTH = 2200;
export const CAROUSEL_MIN_IMAGES = 2;
export const CAROUSEL_MAX_IMAGES = 10;

export const AVATAR_SIZE = 320;
export const AVATAR_QUALITY = 0.85;
export const IMAGE_MAX_WIDTH = 1080;
export const IMAGE_QUALITY = 0.82;

// O que o navegador aceita como entrada. Tudo sai dele como JPEG.
export const IMAGE_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_OUTPUT_TYPE = "image/jpeg";

export const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

// Limite por arquivo do plano gratuito do Supabase (50 MB).
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
// Folga pro que o servidor aceita de uma imagem já redimensionada.
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export function avatarPath(clientId: string): string {
  return `clients/${clientId}/avatar.jpg`;
}

export function clientFolder(clientId: string): string {
  return `clients/${clientId}`;
}

export function presentationFolder(presentationId: string): string {
  return `presentations/${presentationId}`;
}
