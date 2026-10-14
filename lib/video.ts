import type { FFFSType, FFmpeg } from "@ffmpeg/ffmpeg";
import { FFMPEG_ASSETS, type FfmpegAsset } from "./ffmpeg-assets";
import { IMAGE_MAX_WIDTH, IMAGE_OUTPUT_TYPE, IMAGE_QUALITY } from "./media";
import {
  afterEncode,
  compressionArgs,
  detectTransfer,
  VIDEO_CRF,
  VIDEO_OUTPUT_EXTENSION,
  VIDEO_OUTPUT_TYPE,
  type FailureStage,
  type VideoTransfer,
} from "./video-rules";

// Só roda no navegador. O ffmpeg.wasm (~32 MB) é baixado do CDN quando alguém
// escolhe um vídeo, nunca antes, e não entra no bundle do painel.
//
// O @ffmpeg/ffmpeg do package.json só dá os tipos. O Turbopack não empacota o
// worker dele (a URL do worker e a do núcleo só existem na hora), então a
// classe e o worker também vêm do CDN, na mesma versão.

export class VideoCompressionError extends Error {
  constructor(
    // "limit" é o vídeo que não coube em 50 MB nem na segunda tentativa.
    readonly stage: FailureStage | "cancelled" | "limit",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "VideoCompressionError";
  }
}

export type CompressedVideo = {
  file: File;
  crf: number;
  transfer: VideoTransfer;
  seconds: number;
};

type Loaded = {
  FFmpeg: typeof FFmpeg;
  config: { classWorkerURL: string; coreURL: string; wasmURL: string };
};
let loaded: Promise<Loaded> | null = null;

async function sha384(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-384", bytes));
  return btoa(String.fromCharCode(...digest));
}

// Baixa o arquivo e confere o hash antes de qualquer uso.
async function download(asset: FfmpegAsset): Promise<ArrayBuffer> {
  // Uma segunda chance pra falha passageira de rede.
  const response = await fetch(asset.url).catch(() => fetch(asset.url));
  if (!response.ok) throw new Error(`O CDN respondeu ${response.status}.`);
  const bytes = await response.arrayBuffer();
  if ((await sha384(bytes)) !== asset.sha384) {
    throw new Error("Um arquivo do ffmpeg veio diferente do esperado.");
  }
  return bytes;
}

// Vira blob porque o worker não pode carregar script de outra origem direto.
async function blobUrl(asset: FfmpegAsset, type = "text/javascript"): Promise<string> {
  return URL.createObjectURL(new Blob([await download(asset)], { type }));
}

// O worker importa dois módulos vizinhos por caminho relativo, que não existe
// num blob: os imports passam a apontar pros blobs deles.
async function workerUrl(): Promise<string> {
  const [source, constUrl, errorsUrl] = await Promise.all([
    download(FFMPEG_ASSETS.worker),
    blobUrl(FFMPEG_ASSETS.workerConst),
    blobUrl(FFMPEG_ASSETS.workerErrors),
  ]);
  const linked = new TextDecoder()
    .decode(source)
    .replace('"./const.js"', JSON.stringify(constUrl))
    .replace('"./errors.js"', JSON.stringify(errorsUrl));
  if (!linked.includes(constUrl) || !linked.includes(errorsUrl)) {
    throw new Error("O worker do ffmpeg mudou de formato.");
  }
  return URL.createObjectURL(new Blob([linked], { type: "text/javascript" }));
}

// A classe FFmpeg entra por <script>, com o hash conferido pelo navegador
// (integrity), e fica em self.FFmpegWASM.
function wrapperScript(): Promise<typeof FFmpeg> {
  type Global = { FFmpegWASM?: { FFmpeg: typeof FFmpeg } };
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = FFMPEG_ASSETS.wrapper.url;
    script.integrity = `sha384-${FFMPEG_ASSETS.wrapper.sha384}`;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const found = (self as Global).FFmpegWASM?.FFmpeg;
      if (found) resolve(found);
      else reject(new Error("O ffmpeg não carregou."));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("O ffmpeg não carregou."));
    };
    document.head.append(script);
  });
}

// Fica guardado pra próxima compressão não baixar de novo.
function loadFfmpeg(): Promise<Loaded> {
  loaded ??= (async () => {
    const [FFmpeg, classWorkerURL, coreURL, wasmURL] = await Promise.all([
      wrapperScript(),
      workerUrl(),
      blobUrl(FFMPEG_ASSETS.core),
      blobUrl(FFMPEG_ASSETS.wasm, "application/wasm"),
    ]);
    return { FFmpeg, config: { classWorkerURL, coreURL, wasmURL } };
  })();
  loaded.catch(() => {
    loaded = null;
  });
  return loaded;
}

const INPUT_DIR = "/input";
const OUTPUT = `output.${VIDEO_OUTPUT_EXTENSION}`;

export async function compressVideo(
  source: File,
  {
    signal,
    onStage,
    onProgress,
  }: {
    signal: AbortSignal;
    onStage: (stage: "loading" | "encoding") => void;
    onProgress: (fraction: number) => void;
  },
): Promise<CompressedVideo> {
  const cancelled = () => new VideoCompressionError("cancelled", "Compressão cancelada.");
  const started = performance.now();
  onStage("loading");

  let ffmpeg: FFmpeg;
  try {
    const { FFmpeg, config } = await loadFfmpeg();
    if (signal.aborted) throw cancelled();
    ffmpeg = new FFmpeg();
    await ffmpeg.load(config, { signal });
  } catch (cause) {
    if (signal.aborted) throw cancelled();
    if (cause instanceof VideoCompressionError) throw cause;
    throw new VideoCompressionError("load", "O ffmpeg não carregou.", { cause });
  }

  // Cancelar mata o worker: é o único jeito de parar o ffmpeg no meio.
  const stop = () => ffmpeg.terminate();
  signal.addEventListener("abort", stop);

  try {
    let log = "";
    ffmpeg.on("log", ({ message }) => {
      // Só o começo interessa (a descrição da entrada).
      if (log.length < 20_000) log += `${message}\n`;
    });
    ffmpeg.on("progress", ({ progress }) => {
      if (Number.isFinite(progress)) onProgress(Math.min(1, Math.max(0, progress)));
    });

    // WORKERFS lê o arquivo direto do disco, sem copiar pra memória do wasm.
    // O nome fixo evita problema com acento e espaço no nome original.
    const input = `${INPUT_DIR}/video`;
    await ffmpeg.createDir(INPUT_DIR);
    await ffmpeg.mount(
      "WORKERFS" as FFFSType,
      { files: [new File([source], "video")] },
      INPUT_DIR,
    );

    // Sem saída o ffmpeg só descreve a entrada (e devolve erro, de propósito).
    await ffmpeg.exec(["-hide_banner", "-i", input]);
    const transfer = detectTransfer(log);

    onStage("encoding");
    for (let crf = VIDEO_CRF; ; ) {
      onProgress(0);
      const code = await ffmpeg.exec(compressionArgs(input, OUTPUT, crf, transfer));
      if (code !== 0) {
        throw new VideoCompressionError("encode", `O ffmpeg terminou com o código ${code}.`);
      }
      const data = await ffmpeg.readFile(OUTPUT);
      await ffmpeg.deleteFile(OUTPUT);
      if (typeof data === "string" || data.byteLength === 0) {
        throw new VideoCompressionError("encode", "O ffmpeg não gerou o vídeo.");
      }

      const decision = afterEncode(data.byteLength, crf);
      if (decision.action === "error") {
        throw new VideoCompressionError("limit", decision.message);
      }
      if (decision.action === "retry") {
        crf = decision.crf;
        continue;
      }

      const name = `${source.name.replace(/\.[^.]+$/, "")}.${VIDEO_OUTPUT_EXTENSION}`;
      return {
        file: new File([data as Uint8Array<ArrayBuffer>], name, { type: VIDEO_OUTPUT_TYPE }),
        crf,
        transfer,
        seconds: (performance.now() - started) / 1000,
      };
    }
  } catch (cause) {
    if (signal.aborted) throw cancelled();
    if (cause instanceof VideoCompressionError) throw cause;
    throw new VideoCompressionError("encode", "O ffmpeg falhou durante a conversão.", {
      cause,
    });
  } finally {
    signal.removeEventListener("abort", stop);
    // A memória do wasm só volta pro navegador quando o worker morre.
    ffmpeg.terminate();
  }
}

// Capa ---------------------------------------------------------------------

export type VideoFrames = {
  duration: number;
  // Um quadro em JPEG, com 1080 px de largura.
  capture: (seconds: number) => Promise<Blob>;
  close: () => void;
};

// Abre o vídeo num <video> fora da tela pra tirar quadros dele. Rejeita se o
// navegador não decodifica o arquivo (HEVC sem compressão, por exemplo).
export function openVideoFrames(source: Blob): Promise<VideoFrames> {
  const url = URL.createObjectURL(source);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const close = () => {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  };

  // Um pedido por vez: o <video> só tem uma posição.
  let queue: Promise<unknown> = Promise.resolve();

  async function capture(seconds: number): Promise<Blob> {
    const target = Math.min(Math.max(0, seconds), Math.max(0, video.duration - 0.05));
    if (Math.abs(video.currentTime - target) > 0.001 || video.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
        video.addEventListener("error", () => reject(new Error("O vídeo não abriu.")), {
          once: true,
        });
        video.currentTime = target;
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_MAX_WIDTH;
    canvas.height = Math.round((video.videoHeight * IMAGE_MAX_WIDTH) / video.videoWidth);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu gerar a capa.");
    context.imageSmoothingQuality = "high";
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("O navegador não conseguiu gerar a capa.")),
        IMAGE_OUTPUT_TYPE,
        IMAGE_QUALITY,
      );
    });
  }

  return new Promise((resolve, reject) => {
    video.addEventListener(
      "loadeddata",
      () => {
        if (!video.videoWidth || !Number.isFinite(video.duration)) {
          close();
          reject(new Error("O navegador não leu o vídeo."));
          return;
        }
        resolve({
          duration: video.duration,
          capture: (seconds) => {
            const next = queue.then(() => capture(seconds));
            queue = next.catch(() => {});
            return next;
          },
          close,
        });
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        close();
        reject(new Error("O navegador não leu o vídeo."));
      },
      { once: true },
    );
    video.src = url;
  });
}
