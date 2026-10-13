import type { Post } from "./types";

export function postTypeLabel(post: Post): string {
  if (post.type === "reels") return "Reels";
  if (post.type === "carousel") {
    const count = post.media.length;
    return `Carrossel · ${count} ${count === 1 ? "imagem" : "imagens"}`;
  }
  return "Post";
}

export function postThumbnail(post: Post): string | undefined {
  const first = post.media[0];
  if (!first) return undefined;
  return first.kind === "video" ? first.poster : first.url;
}

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

// Separa as hashtags do corpo da legenda, preservando as quebras de linha.
export function splitCaption(caption: string): {
  body: string;
  hashtags: string[];
} {
  const hashtags = caption.match(HASHTAG) ?? [];
  const body = caption
    .split("\n")
    .map((line) => line.replace(HASHTAG, "").replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { body, hashtags };
}
