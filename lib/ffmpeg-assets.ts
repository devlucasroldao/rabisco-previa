// Os arquivos do ffmpeg.wasm, baixados do CDN só quando alguém escolhe um
// vídeo. Nenhum .wasm fica no repositório.
//
// Versão fixada e hash conferido no navegador antes de usar: se o CDN servir
// outra coisa, o ffmpeg não carrega. Pra trocar de versão, atualize aqui e no
// package.json (o pnpm test confere que batem) e recalcule os hashes com
//   openssl dgst -sha384 -binary <arquivo> | openssl base64 -A
// a partir dos arquivos do pacote no npm.

export const FFMPEG_VERSION = "0.12.15";
// Núcleo de uma thread (@ffmpeg/core, não o core-mt): dispensa o
// SharedArrayBuffer e, com ele, os cabeçalhos COOP/COEP.
export const FFMPEG_CORE_VERSION = "0.12.10";

const CDN = "https://cdn.jsdelivr.net/npm";
const WRAPPER = `${CDN}/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist`;
const CORE = `${CDN}/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export type FfmpegAsset = { url: string; sha384: string };

export const FFMPEG_ASSETS = {
  // A classe FFmpeg, que fala com o worker.
  wrapper: {
    url: `${WRAPPER}/umd/ffmpeg.js`,
    sha384: "6gtICseWoSfROfflbGSkg1kwPTH+2SxMvyn0e3THJbNoyPxx5tzNk4EXfLIHD2iD",
  },
  // O worker, em ESM, e os dois módulos que ele importa.
  worker: {
    url: `${WRAPPER}/esm/worker.js`,
    sha384: "JZ7yh1b5HmCuJXkNZGL9h666je28uEv66wzn87yaS9bMi8n0lsyVZz0UimGEHGef",
  },
  workerConst: {
    url: `${WRAPPER}/esm/const.js`,
    sha384: "6vDSlGIJfqCnQcg4hjFKj9R+LCxAEPU3tJeHV7nmrAhusI63XIuxsDhcw1/QIv21",
  },
  workerErrors: {
    url: `${WRAPPER}/esm/errors.js`,
    sha384: "WRM2DF0pbEs4S/rvSjG/3pjuy9TQBIQqH/yusLQrZzAinEIQucUuhgxXEdcxddCi",
  },
  core: {
    url: `${CORE}/ffmpeg-core.js`,
    sha384: "9KlAmgHu5wDqdgQvFhQGZOtKdCwGcMppDhM/kBkUpZ5LS7KGuAHbE+NgtJQEf84i",
  },
  wasm: {
    url: `${CORE}/ffmpeg-core.wasm`,
    sha384: "U1VDhkPYrM3wTCT4/vjSpSsKqG/UjljYrYCI4hBSJ02svbCkxuCi6U6u/peg5vpW",
  },
} satisfies Record<string, FfmpegAsset>;
