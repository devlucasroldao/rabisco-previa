// Limites e decisões da compressão de vídeo. Sem navegador nem ffmpeg aqui:
// é o que o pnpm test cobre. Quem roda o ffmpeg é o lib/video.ts.

import { VIDEO_EXTENSIONS, VIDEO_MAX_BYTES } from "./media";

// Acima disso o ffmpeg.wasm (32 bits, uma thread) fica sem memória.
export const VIDEO_INPUT_MAX_BYTES = 300 * 1024 * 1024;

export const VIDEO_SHORT_SIDE = 720;
export const VIDEO_MAX_FPS = 30;
export const VIDEO_CRF = 26;
// Segunda e última tentativa, quando a primeira passa do limite do bucket.
export const VIDEO_RETRY_CRF = 30;
export const VIDEO_OUTPUT_TYPE = "video/mp4";
export const VIDEO_OUTPUT_EXTENSION = "mp4";

// A capa automática sai de 1 s de vídeo, pra fugir do quadro preto do começo.
export const COVER_DEFAULT_SECONDS = 1;

export function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

type FileInfo = { name: string; type: string; size: number };

// O tipo MIME do vídeo. Alguns sistemas entregam o .mov sem tipo, então a
// extensão desempata.
export function videoInputType(file: Pick<FileInfo, "name" | "type">): string | null {
  if (VIDEO_EXTENSIONS[file.type]) return file.type;
  if (file.type) return null;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const match = Object.entries(VIDEO_EXTENSIONS).find(([, known]) => known === extension);
  return match ? match[0] : null;
}

export function videoInputError(file: FileInfo): string | null {
  if (!videoInputType(file)) return "O vídeo precisa ser MP4 ou MOV.";
  if (file.size > VIDEO_INPUT_MAX_BYTES) {
    return `O vídeo tem ${megabytes(file.size)} e o navegador só consegue comprimir até ${megabytes(VIDEO_INPUT_MAX_BYTES)} (limite de memória). Exporte de novo com menos resolução ou em partes menores.`;
  }
  return null;
}

// Vídeo em HDR (HLG ou PQ) precisa virar SDR, senão a cor sai lavada.
export type VideoTransfer = "sdr" | "hlg" | "pq";

export const HDR_WARNING =
  "Este vídeo veio em HDR e foi convertido pra cores normais (SDR). Confira a cor no quadro da capa antes de salvar.";

// O ffmpeg descreve a entrada no log, numa linha "Stream #0:0 ... Video: ...".
export function detectTransfer(log: string): VideoTransfer {
  const stream = log.split("\n").find((line) => /Stream #0.*Video:/.test(line)) ?? "";
  if (stream.includes("arib-std-b67")) return "hlg";
  if (stream.includes("smpte2084")) return "pq";
  return "sdr";
}

// HDR pra SDR (BT.709) com o zscale, já no tamanho final pra custar menos.
const TONEMAP =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv";

export function compressionArgs(
  input: string,
  output: string,
  crf: number,
  transfer: VideoTransfer = "sdr",
): string[] {
  const side = VIDEO_SHORT_SIDE;
  const filters = [
    // Lado menor em até 720 px, sem ampliar e sempre par (o yuv420p exige).
    // O ffmpeg aplica a rotação do iPhone antes dos filtros, então iw e ih
    // já são os da imagem em pé.
    `scale=w='if(lt(iw,ih),2*trunc(min(iw,${side})/2),-2)':h='if(lt(iw,ih),-2,2*trunc(min(ih,${side})/2))'`,
    `fps=fps='min(${VIDEO_MAX_FPS},source_fps)'`,
    ...(transfer === "sdr" ? [] : [TONEMAP]),
    "format=yuv420p",
  ];
  return [
    "-i", input,
    // Só o primeiro vídeo e o primeiro áudio (se houver).
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", filters.join(","),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", String(crf),
    "-pix_fmt", "yuv420p",
    ...(transfer === "sdr"
      ? []
      : ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]),
    "-c:a", "aac",
    "-b:a", "128k",
    "-ac", "2",
    "-movflags", "+faststart",
    output,
  ];
}

export type EncodeDecision =
  | { action: "accept" }
  | { action: "retry"; crf: number }
  | { action: "error"; message: string };

// O que fazer com o arquivo que saiu do ffmpeg numa tentativa com esse CRF.
export function afterEncode(outputBytes: number, crf: number): EncodeDecision {
  if (outputBytes <= VIDEO_MAX_BYTES) return { action: "accept" };
  if (crf < VIDEO_RETRY_CRF) return { action: "retry", crf: VIDEO_RETRY_CRF };
  return {
    action: "error",
    message: `Mesmo comprimido, o vídeo ficou com ${megabytes(outputBytes)} e o limite é ${megabytes(VIDEO_MAX_BYTES)}. Exporte um vídeo mais curto.`,
  };
}

// "load": o ffmpeg não carregou (rede, navegador). "encode": carregou, mas
// não conseguiu converter este arquivo.
export type FailureStage = "load" | "encode";

export type FailureDecision =
  | { action: "use-original"; warning: string }
  | { action: "error"; message: string };

// Sem compressão, o original só serve se couber no bucket.
export function afterFailure(stage: FailureStage, originalBytes: number): FailureDecision {
  const what =
    stage === "load"
      ? "Não deu pra carregar o compressor de vídeo (rede ou navegador)."
      : "Não deu pra comprimir este vídeo.";
  if (originalBytes <= VIDEO_MAX_BYTES) {
    return {
      action: "use-original",
      warning: `${what} O arquivo original será enviado sem compressão e pode não tocar em todo navegador (o HEVC do iPhone, por exemplo).`,
    };
  }
  return {
    action: "error",
    message: `${what} O original tem ${megabytes(originalBytes)} e sem compressão o limite é ${megabytes(VIDEO_MAX_BYTES)}. Tente de novo ou use outro navegador.`,
  };
}
