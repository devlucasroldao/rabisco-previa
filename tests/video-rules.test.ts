import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FFMPEG_ASSETS, FFMPEG_CORE_VERSION, FFMPEG_VERSION } from "../lib/ffmpeg-assets";
import { VIDEO_MAX_BYTES } from "../lib/media";
import {
  afterEncode,
  afterFailure,
  compressionArgs,
  detectTransfer,
  VIDEO_CRF,
  VIDEO_INPUT_MAX_BYTES,
  VIDEO_RETRY_CRF,
  videoInputError,
  videoInputType,
} from "../lib/video-rules";

const MB = 1024 * 1024;

test("aceita MP4 e MOV, pelo tipo ou pela extensão quando o tipo vem vazio", () => {
  assert.equal(videoInputType({ name: "a.mp4", type: "video/mp4" }), "video/mp4");
  assert.equal(videoInputType({ name: "a.mov", type: "video/quicktime" }), "video/quicktime");
  assert.equal(videoInputType({ name: "CapCut.MOV", type: "" }), "video/quicktime");
  assert.equal(videoInputType({ name: "a.mp4", type: "" }), "video/mp4");
  assert.equal(videoInputType({ name: "a.webm", type: "video/webm" }), null);
  // Tipo declarado vale mais que a extensão.
  assert.equal(videoInputType({ name: "a.mov", type: "image/png" }), null);
  assert.equal(videoInputType({ name: "sem-extensao", type: "" }), null);
});

test("entrada: até 300 MB passa, acima disso o erro cita a memória do navegador", () => {
  const file = (size: number) => ({ name: "a.mov", type: "video/quicktime", size });
  assert.equal(videoInputError(file(80 * MB)), null);
  assert.equal(videoInputError(file(VIDEO_INPUT_MAX_BYTES)), null);
  const tooBig = videoInputError(file(VIDEO_INPUT_MAX_BYTES + 1));
  assert.match(tooBig ?? "", /300,0 MB/);
  assert.match(tooBig ?? "", /memória/);
  assert.equal(
    videoInputError({ name: "a.avi", type: "video/x-msvideo", size: MB }),
    "O vídeo precisa ser MP4 ou MOV.",
  );
});

test("saída até 50 MB é aceita em qualquer tentativa", () => {
  assert.deepEqual(afterEncode(VIDEO_MAX_BYTES, VIDEO_CRF), { action: "accept" });
  assert.deepEqual(afterEncode(12 * MB, VIDEO_RETRY_CRF), { action: "accept" });
});

test("saída acima de 50 MB: uma segunda tentativa com CRF 30, depois erro", () => {
  assert.deepEqual(afterEncode(VIDEO_MAX_BYTES + 1, VIDEO_CRF), { action: "retry", crf: 30 });
  const last = afterEncode(61 * MB, VIDEO_RETRY_CRF);
  assert.equal(last.action, "error");
  assert.match(last.action === "error" ? last.message : "", /61,0 MB.*50,0 MB/);
});

test("sem o ffmpeg: o original vai com aviso se tiver até 50 MB, senão é erro", () => {
  for (const stage of ["load", "encode"] as const) {
    const small = afterFailure(stage, VIDEO_MAX_BYTES);
    assert.equal(small.action, "use-original");
    assert.match(small.action === "use-original" ? small.warning : "", /sem compressão/);

    const big = afterFailure(stage, VIDEO_MAX_BYTES + 1);
    assert.equal(big.action, "error");
    assert.match(big.action === "error" ? big.message : "", /50,0 MB/);
  }
  const load = afterFailure("load", MB);
  assert.match(load.action === "use-original" ? load.warning : "", /carregar o compressor/);
});

test("argumentos do ffmpeg: H.264 + AAC 128k, 720 px, 30 fps, CRF, veryfast, yuv420p, faststart", () => {
  const args = compressionArgs("in.mov", "out.mp4", VIDEO_CRF);
  const value = (flag: string) => args[args.indexOf(flag) + 1];
  assert.equal(args[0], "-i");
  assert.equal(args.at(-1), "out.mp4");
  assert.equal(value("-c:v"), "libx264");
  assert.equal(value("-crf"), "26");
  assert.equal(value("-preset"), "veryfast");
  assert.equal(value("-pix_fmt"), "yuv420p");
  assert.equal(value("-c:a"), "aac");
  assert.equal(value("-b:a"), "128k");
  assert.equal(value("-movflags"), "+faststart");
  assert.match(value("-vf"), /min\(iw,720\)/);
  assert.match(value("-vf"), /min\(ih,720\)/);
  assert.match(value("-vf"), /min\(30,source_fps\)/);
  assert.doesNotMatch(value("-vf"), /tonemap/);
  assert.equal(compressionArgs("in.mov", "out.mp4", VIDEO_RETRY_CRF).includes("30"), true);
});

test("vídeo em HDR ganha a conversão pra SDR e sai marcado como BT.709", () => {
  for (const transfer of ["hlg", "pq"] as const) {
    const args = compressionArgs("in.mov", "out.mp4", VIDEO_CRF, transfer);
    assert.match(args[args.indexOf("-vf") + 1], /zscale.*tonemap/);
    assert.equal(args[args.indexOf("-color_trc") + 1], "bt709");
  }
});

test("detecta HLG e PQ pela descrição da entrada no log do ffmpeg", () => {
  const stream = (colors: string) =>
    `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/input/video':\n  Stream #0:0[0x1](und): Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(${colors}), 1920x1080, 30 fps (default)\n  Stream #0:1[0x2](und): Audio: aac (LC)`;
  assert.equal(detectTransfer(stream("tv, bt2020nc/bt2020/arib-std-b67")), "hlg");
  assert.equal(detectTransfer(stream("tv, bt2020nc/bt2020/smpte2084")), "pq");
  assert.equal(detectTransfer(stream("tv, bt709")), "sdr");
  assert.equal(detectTransfer(""), "sdr");
});

test("ffmpeg do CDN: versão fixada igual à do package.json, com hash em todo arquivo", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(manifest.devDependencies["@ffmpeg/ffmpeg"], FFMPEG_VERSION);
  for (const [name, asset] of Object.entries(FFMPEG_ASSETS)) {
    const version = ["core", "wasm"].includes(name)
      ? `@ffmpeg/core@${FFMPEG_CORE_VERSION}/`
      : `@ffmpeg/ffmpeg@${FFMPEG_VERSION}/`;
    assert.ok(asset.url.includes(version), `${name} sem versão fixada`);
    // SHA-384 em base64 tem 64 caracteres.
    assert.match(asset.sha384, /^[A-Za-z0-9+/]{64}$/, `${name} sem hash`);
  }
  // Uma thread: nada de core-mt, que exigiria COOP/COEP.
  assert.ok(!FFMPEG_ASSETS.core.url.includes("core-mt"));
});
