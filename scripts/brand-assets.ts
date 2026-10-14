// Gera as versões web dos arquivos da marca a partir dos originais de
// public/brand/ (PNG quadrado com fundo sólido). Uso: pnpm brand:assets
//
// Recorta o desenho rente ao fundo (trim), devolve uma margem na cor do fundo
// e salva em public/brand/web/ nos tamanhos que o painel usa (1x e 2x).

import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = path.join("public", "brand");
const OUT = path.join(SOURCE, "web");

const TERRACOTA = "#C65D3B";
const CREME = "#FDFAF7";

type Job = {
  source: string;
  background: string;
  // Margem em volta do desenho recortado, em fração do lado maior.
  padding: number;
  // Quadrado (monograma e ícones) ou proporção livre (wordmark).
  square: boolean;
  outputs: { name: string; width: number }[];
};

const jobs: Job[] = [
  {
    // Monograma "r." da barra lateral (32 px) e ícones da aba.
    source: "marca-creme-sobre-terracota.png",
    background: TERRACOTA,
    padding: 0.22,
    square: true,
    outputs: [
      { name: "marca-32.png", width: 32 },
      { name: "marca-64.png", width: 64 },
      { name: "favicon-32.png", width: 32 },
      { name: "favicon-48.png", width: 48 },
      { name: "apple-touch-icon.png", width: 180 },
      { name: "icon-192.png", width: 192 },
      { name: "icon-512.png", width: 512 },
    ],
  },
  {
    // Wordmark do login, sobre a coluna terracota.
    source: "wordmark-creme-sobre-terracota.png",
    background: TERRACOTA,
    padding: 0,
    square: false,
    outputs: [
      { name: "wordmark-creme-240.png", width: 240 },
      { name: "wordmark-creme-480.png", width: 480 },
    ],
  },
  {
    // Wordmark da página "prévia não existe", sobre o creme.
    source: "wordmark-terracota-sobre-creme.png",
    background: CREME,
    padding: 0.06,
    square: false,
    outputs: [
      { name: "wordmark-terracota-160.png", width: 160 },
      { name: "wordmark-terracota-320.png", width: 320 },
    ],
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const job of jobs) {
    const trimmed = await sharp(path.join(SOURCE, job.source))
      .trim({ background: job.background, threshold: 24 })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = trimmed.info;
    const pad = Math.round(Math.max(width, height) * job.padding);
    const side = Math.max(width, height) + pad * 2;
    const extended = job.square
      ? {
          top: Math.floor((side - height) / 2),
          bottom: Math.ceil((side - height) / 2),
          left: Math.floor((side - width) / 2),
          right: Math.ceil((side - width) / 2),
        }
      : { top: pad, bottom: pad, left: pad, right: pad };
    const base = await sharp(trimmed.data)
      .extend({ ...extended, background: job.background })
      .toBuffer();

    for (const output of job.outputs) {
      const file = path.join(OUT, output.name);
      await sharp(base)
        .resize({ width: output.width })
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toFile(file);
      const { width: w, height: h } = await sharp(file).metadata();
      console.log(`${output.name.padEnd(28)} ${w}×${h}  ${(statSync(file).size / 1024).toFixed(1)} KB`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
