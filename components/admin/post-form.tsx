"use client";

import { useState } from "react";
import { savePost } from "@/app/admin/actions";
import type { AdminPost } from "@/lib/admin-data";
import { resizePostImage } from "@/lib/image";
import {
  CAPTION_MAX_LENGTH,
  CAROUSEL_MAX_IMAGES,
  CAROUSEL_MIN_IMAGES,
  IMAGE_INPUT_TYPES,
  IMAGE_OUTPUT_TYPE,
  POST_TYPE_LABELS,
  presentationFolder,
  VIDEO_EXTENSIONS,
  VIDEO_MAX_BYTES,
  type PostType,
  type StoredMedia,
} from "@/lib/media";
import { removeFromBucket, uploadToBucket } from "@/lib/upload";
import { ProgressBar } from "./progress-bar";
import {
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

type Role = "image" | "video" | "cover";

// Um arquivo do post: já no bucket (path) ou escolhido agora (file).
type Slot = {
  key: string;
  role: Role;
  name: string;
  file?: File;
  path?: string;
  previewUrl: string | null;
  progress: number | null;
};

const fileInputClass =
  "mt-1 block w-full text-[13px] text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-background file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground";

function storedSlot(role: Role, path: string, previewUrl: string | null): Slot {
  return {
    key: path,
    role,
    name: role === "video" ? "Vídeo atual" : "Imagem atual",
    path,
    previewUrl,
    progress: null,
  };
}

function initialSlots(post?: AdminPost): Slot[] {
  if (!post) return [];
  return post.media.flatMap((item) =>
    item.kind === "video"
      ? [
          storedSlot("video", item.path, null),
          ...(item.poster ? [storedSlot("cover", item.poster, item.posterUrl)] : []),
        ]
      : [storedSlot("image", item.path, item.url)],
  );
}

function newSlot(role: Role, file: File): Slot {
  return {
    key: crypto.randomUUID(),
    role,
    name: file.name,
    file,
    previewUrl: role === "video" ? null : URL.createObjectURL(file),
    progress: null,
  };
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function PostForm({
  presentationId,
  post,
  onDone,
}: {
  presentationId: string;
  post?: AdminPost;
  onDone: () => void;
}) {
  const [type, setType] = useState<PostType>(post?.type ?? "post");
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [slots, setSlots] = useState<Slot[]>(() => initialSlots(post));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const images = slots.filter((slot) => slot.role === "image");
  const video = slots.find((slot) => slot.role === "video");
  const cover = slots.find((slot) => slot.role === "cover");

  function changeType(next: PostType) {
    setType(next);
    setSlots([]);
    setError(null);
  }

  function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = "";
    setError(null);

    const invalid = files.find((file) => !IMAGE_INPUT_TYPES.includes(file.type));
    if (invalid) {
      setError(`"${invalid.name}" precisa ser JPG, PNG ou WebP.`);
      return;
    }
    if (type === "post") {
      if (files[0]) setSlots([newSlot("image", files[0])]);
      return;
    }
    if (images.length + files.length > CAROUSEL_MAX_IMAGES) {
      setError(`Um carrossel tem até ${CAROUSEL_MAX_IMAGES} imagens.`);
      return;
    }
    setSlots((current) => [...current, ...files.map((file) => newSlot("image", file))]);
  }

  function setSingle(role: "video" | "cover") {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      setError(null);
      if (!file) return;

      if (role === "video") {
        if (!VIDEO_EXTENSIONS[file.type]) {
          setError("O vídeo precisa ser MP4 ou MOV.");
          return;
        }
        if (file.size > VIDEO_MAX_BYTES) {
          setError(
            `O vídeo tem ${megabytes(file.size)} e o limite é ${megabytes(VIDEO_MAX_BYTES)}.`,
          );
          return;
        }
      } else if (!IMAGE_INPUT_TYPES.includes(file.type)) {
        setError("A capa precisa ser JPG, PNG ou WebP.");
        return;
      }
      setSlots((current) => [
        ...current.filter((slot) => slot.role !== role),
        newSlot(role, file),
      ]);
    };
  }

  function move(index: number, delta: -1 | 1) {
    setSlots((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(key: string) {
    setSlots((current) => current.filter((slot) => slot.key !== key));
  }

  function setProgress(key: string, progress: number | null) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, progress } : slot)),
    );
  }

  function validate(): string | null {
    if (type === "post" && images.length !== 1) return "Escolha 1 imagem.";
    if (type === "carousel" && images.length < CAROUSEL_MIN_IMAGES) {
      return `Um carrossel precisa de ${CAROUSEL_MIN_IMAGES} a ${CAROUSEL_MAX_IMAGES} imagens.`;
    }
    if (type === "reels" && !video) return "Escolha o vídeo.";
    if (type === "reels" && !cover) return "Escolha a imagem de capa.";
    if (caption.length > CAPTION_MAX_LENGTH) {
      return `A legenda aceita até ${CAPTION_MAX_LENGTH} caracteres.`;
    }
    return null;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setBusy(true);

    // O que subiu nesta tentativa, pra desfazer se algo falhar.
    const uploaded: string[] = [];

    // Devolve o caminho do arquivo no bucket, enviando antes se for novo.
    async function send(slot: Slot): Promise<string> {
      if (!slot.file) return slot.path!;

      const isVideo = slot.role === "video";
      const body = isVideo ? slot.file : await resizePostImage(slot.file);
      const contentType = isVideo ? slot.file.type : IMAGE_OUTPUT_TYPE;
      const extension = isVideo ? VIDEO_EXTENSIONS[slot.file.type] : "jpg";
      const path = `${presentationFolder(presentationId)}/${crypto.randomUUID()}.${extension}`;

      setProgress(slot.key, 0);
      await uploadToBucket(path, body, contentType, {
        onProgress: (fraction) => setProgress(slot.key, fraction),
      });
      uploaded.push(path);
      return path;
    }

    try {
      let media: StoredMedia[];
      if (type === "reels") {
        const path = await send(video!);
        media = [{ path, kind: "video", poster: await send(cover!) }];
      } else {
        media = [];
        for (const slot of images) {
          media.push({ path: await send(slot), kind: "image" });
        }
      }

      // A linha do post só é gravada depois que todos os envios terminaram.
      const result = await savePost({
        presentationId,
        postId: post?.id,
        type,
        caption,
        media,
      });
      if (result.error) throw new Error(result.error);
      onDone();
    } catch (cause) {
      await removeFromBucket(uploaded).catch(() => {});
      setSlots((current) => current.map((slot) => ({ ...slot, progress: null })));
      setError(cause instanceof Error ? cause.message : "Não deu pra salvar o post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={post ? "Editar post" : "Novo post"}
      className="space-y-4 rounded-lg border border-line p-4"
    >
      {post ? (
        <p className="text-[13px] text-muted">
          Tipo: <span className="font-medium text-foreground">{POST_TYPE_LABELS[type]}</span>
        </p>
      ) : (
        <fieldset disabled={busy}>
          <legend className={labelClass}>Tipo</legend>
          <div className="mt-1 flex gap-4 text-[14px]">
            {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((option) => (
              <label key={option} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="type"
                  value={option}
                  checked={type === option}
                  onChange={() => changeType(option)}
                />
                {POST_TYPE_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {type === "reels" ? (
        <>
          <p className="rounded-md bg-surface px-3 py-2 text-[13px]">
            Envie o vídeo já em H.264 (MP4). Vídeos de iPhone costumam vir em HEVC
            e podem não tocar no Chrome. A compressão automática chega na próxima
            etapa.
          </p>
          <label className={labelClass}>
            Vídeo (MP4 ou MOV, até {megabytes(VIDEO_MAX_BYTES)})
            <input
              type="file"
              accept={Object.keys(VIDEO_EXTENSIONS).join(",")}
              onChange={setSingle("video")}
              disabled={busy}
              className={fileInputClass}
            />
          </label>
          {video && <SlotRow slot={video} detail={video.file && megabytes(video.file.size)} />}
          <label className={labelClass}>
            Capa (imagem)
            <input
              type="file"
              accept={IMAGE_INPUT_TYPES.join(",")}
              onChange={setSingle("cover")}
              disabled={busy}
              className={fileInputClass}
            />
          </label>
          {cover && <SlotRow slot={cover} />}
        </>
      ) : (
        <>
          <label className={labelClass}>
            {type === "post"
              ? "Imagem"
              : `Imagens (${CAROUSEL_MIN_IMAGES} a ${CAROUSEL_MAX_IMAGES}, na ordem do carrossel)`}
            <input
              type="file"
              accept={IMAGE_INPUT_TYPES.join(",")}
              multiple={type === "carousel"}
              onChange={addImages}
              disabled={busy}
              className={fileInputClass}
            />
          </label>
          {images.length > 0 && (
            <ol className="space-y-2">
              {images.map((slot, index) => (
                <li key={slot.key}>
                  <SlotRow slot={slot} number={type === "carousel" ? index + 1 : undefined}>
                    {type === "carousel" && (
                      <>
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={busy || index === 0}
                          aria-label={`Subir a imagem ${index + 1}`}
                          className={secondaryButtonClass}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={busy || index === images.length - 1}
                          aria-label={`Descer a imagem ${index + 1}`}
                          className={secondaryButtonClass}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(slot.key)}
                          disabled={busy}
                          aria-label={`Remover a imagem ${index + 1}`}
                          className={secondaryButtonClass}
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </SlotRow>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <label className={labelClass}>
        Legenda
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          rows={6}
          maxLength={CAPTION_MAX_LENGTH}
          disabled={busy}
          placeholder="Texto do post, com as hashtags no final."
          className={inputClass}
        />
        <span className="mt-1 block text-right text-[12px] font-normal text-muted tabular-nums">
          {caption.length}/{CAPTION_MAX_LENGTH}
        </span>
      </label>

      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Enviando…" : post ? "Salvar post" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={busy}
          className={secondaryButtonClass}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SlotRow({
  slot,
  number,
  detail,
  children,
}: {
  slot: Slot;
  number?: number;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        {number !== undefined && (
          <span className="w-4 text-[13px] text-muted tabular-nums">{number}</span>
        )}
        <span className="block h-14 w-11 shrink-0 overflow-hidden rounded border border-line bg-surface">
          {slot.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local ou URL assinada
            <img src={slot.previewUrl} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {slot.name}
          {detail && <span className="text-muted"> · {detail}</span>}
        </span>
        {children}
      </div>
      {slot.progress !== null && (
        <ProgressBar value={slot.progress} label={`Envio de ${slot.name}`} />
      )}
    </div>
  );
}
