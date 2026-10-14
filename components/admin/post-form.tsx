"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  compressVideo,
  openVideoFrames,
  VideoCompressionError,
  type VideoFrames,
} from "@/lib/video";
import {
  afterFailure,
  COVER_DEFAULT_SECONDS,
  HDR_WARNING,
  megabytes,
  VIDEO_INPUT_MAX_BYTES,
  videoInputError,
  videoInputType,
} from "@/lib/video-rules";
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
  // Já está no formato final (quadro do vídeo): não passa pelo redimensionamento.
  ready?: boolean;
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

// A compressão em andamento e o resultado dela.
type Compressing = { stage: "loading" | "encoding"; progress: number };
type VideoResult = { originalBytes: number; finalBytes: number; warning?: string };

const COMPRESSING_MESSAGE =
  "Comprimindo no seu computador. Pode levar alguns minutos, mantenha esta aba aberta.";

function clock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
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
  const [compressing, setCompressing] = useState<Compressing | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [frames, setFrames] = useState<{ duration: number; at: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  // O vídeo aberto pra tirar os quadros da capa.
  const opened = useRef<VideoFrames | null>(null);
  // Só o último quadro pedido no controle deslizante vira capa.
  const frameRequest = useRef(0);
  // Enquanto comprime ou envia, nada mais muda no formulário.
  const locked = busy || compressing !== null;

  useEffect(
    () => () => {
      abort.current?.abort();
      opened.current?.close();
    },
    [],
  );

  const images = slots.filter((slot) => slot.role === "image");
  const video = slots.find((slot) => slot.role === "video");
  const cover = slots.find((slot) => slot.role === "cover");

  function changeType(next: PostType) {
    setType(next);
    setSlots([]);
    setError(null);
    forgetVideo();
  }

  function forgetVideo() {
    opened.current?.close();
    opened.current = null;
    frameRequest.current++;
    setFrames(null);
    setVideoResult(null);
  }

  function replaceSlot(slot: Slot) {
    setSlots((current) => [...current.filter((item) => item.role !== slot.role), slot]);
  }

  // Tira um quadro do vídeo e o põe como capa.
  async function pickFrame(seconds: number) {
    const source = opened.current;
    if (!source) return;
    const request = ++frameRequest.current;
    setFrames({ duration: source.duration, at: seconds });
    try {
      const blob = await source.capture(seconds);
      if (request !== frameRequest.current) return;
      const file = new File([blob], `Quadro do vídeo em ${clock(seconds)}`, {
        type: IMAGE_OUTPUT_TYPE,
      });
      replaceSlot({ ...newSlot("cover", file), ready: true });
    } catch {
      // Sem quadro: a capa fica como estava e dá pra enviar uma imagem.
    }
  }

  async function chooseVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const original = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setError(null);
    if (!original) return;

    const invalid = videoInputError(original);
    if (invalid) {
      setError(invalid);
      return;
    }

    forgetVideo();
    const controller = new AbortController();
    abort.current = controller;
    setCompressing({ stage: "loading", progress: 0 });

    let file = original;
    let warning: string | undefined;
    try {
      const compressed = await compressVideo(original, {
        signal: controller.signal,
        onStage: (stage) => setCompressing({ stage, progress: 0 }),
        onProgress: (progress) => setCompressing({ stage: "encoding", progress }),
      });
      file = compressed.file;
      if (compressed.transfer !== "sdr") warning = HDR_WARNING;
    } catch (cause) {
      const stage = cause instanceof VideoCompressionError ? cause.stage : "encode";
      // Fica no console do navegador, pra quem for investigar.
      if (stage !== "cancelled") console.error("[vídeo]", cause);
      if (controller.signal.aborted || stage === "cancelled") {
        setCompressing(null);
        return;
      }
      if (stage === "limit") {
        setCompressing(null);
        setError((cause as Error).message);
        return;
      }
      const decision = afterFailure(stage, original.size);
      if (decision.action === "error") {
        setCompressing(null);
        setError(decision.message);
        return;
      }
      warning = decision.warning;
    }
    if (controller.signal.aborted) return;

    setCompressing(null);
    replaceSlot(newSlot("video", file));
    setVideoResult({ originalBytes: original.size, finalBytes: file.size, warning });

    try {
      const source = await openVideoFrames(file);
      if (controller.signal.aborted) {
        source.close();
        return;
      }
      opened.current = source;
      await pickFrame(Math.min(COVER_DEFAULT_SECONDS, source.duration / 2));
    } catch {
      // O navegador não toca este arquivo (original em HEVC, por exemplo):
      // a capa continua obrigatória e vem de uma imagem enviada.
    }
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

  function chooseCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setError(null);
    if (!file) return;
    if (!IMAGE_INPUT_TYPES.includes(file.type)) {
      setError("A capa precisa ser JPG, PNG ou WebP.");
      return;
    }
    // Um quadro ainda saindo do controle deslizante não passa por cima.
    frameRequest.current++;
    replaceSlot(newSlot("cover", file));
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
    // Vale pro arquivo final, comprimido ou não: é o limite do bucket.
    if (video?.file && video.file.size > VIDEO_MAX_BYTES) {
      return `O vídeo tem ${megabytes(video.file.size)} e o limite é ${megabytes(VIDEO_MAX_BYTES)}.`;
    }
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

      const videoType = slot.role === "video" ? videoInputType(slot.file) : null;
      const body = videoType || slot.ready ? slot.file : await resizePostImage(slot.file);
      const contentType = videoType ?? IMAGE_OUTPUT_TYPE;
      const extension = videoType ? VIDEO_EXTENSIONS[videoType] : "jpg";
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
        <fieldset disabled={locked}>
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
            O vídeo é comprimido aqui no navegador antes do envio (MP4 em H.264,
            720p), então pode vir direto do iPhone ou do CapCut.
          </p>
          <label className={labelClass}>
            Vídeo (MP4 ou MOV, até {megabytes(VIDEO_INPUT_MAX_BYTES)})
            <input
              type="file"
              accept={[...Object.keys(VIDEO_EXTENSIONS), ".mp4", ".mov"].join(",")}
              onChange={chooseVideo}
              disabled={locked}
              className={fileInputClass}
            />
          </label>
          {compressing && (
            <div className="space-y-2 rounded-md border border-line p-3">
              <p role="status" className="text-[13px]">
                {COMPRESSING_MESSAGE}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {compressing.stage === "loading" ? (
                    <p className="text-[12px] text-muted">Carregando o compressor…</p>
                  ) : (
                    <ProgressBar value={compressing.progress} label="Compressão do vídeo" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => abort.current?.abort()}
                  className={secondaryButtonClass}
                >
                  Cancelar compressão
                </button>
              </div>
            </div>
          )}
          {video && !compressing && (
            <SlotRow
              slot={video}
              detail={
                videoResult
                  ? `original ${megabytes(videoResult.originalBytes)} → final ${megabytes(videoResult.finalBytes)}`
                  : undefined
              }
            />
          )}
          {videoResult?.warning && !compressing && (
            <p role="status" className="text-[13px] text-amber-700 dark:text-amber-400">
              {videoResult.warning}
            </p>
          )}
          {frames && !compressing && (
            <label className={labelClass}>
              Quadro da capa ({clock(frames.at)} de {clock(frames.duration)})
              <input
                type="range"
                min={0}
                max={frames.duration}
                step={0.1}
                value={frames.at}
                onChange={(event) => void pickFrame(Number(event.target.value))}
                disabled={locked}
                className="mt-1 block w-full accent-accent"
              />
            </label>
          )}
          <label className={labelClass}>
            Capa (imagem)
            <input
              type="file"
              accept={IMAGE_INPUT_TYPES.join(",")}
              onChange={chooseCover}
              disabled={locked}
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
        <button type="submit" disabled={locked} className={primaryButtonClass}>
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
