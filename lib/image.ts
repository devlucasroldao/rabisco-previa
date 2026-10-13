import {
  AVATAR_QUALITY,
  AVATAR_SIZE,
  IMAGE_INPUT_TYPES,
  IMAGE_MAX_WIDTH,
  IMAGE_OUTPUT_TYPE,
  IMAGE_QUALITY,
} from "./media";

// Só roda no navegador: usa createImageBitmap e canvas.

async function decode(file: File): Promise<ImageBitmap> {
  if (!IMAGE_INPUT_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" precisa ser JPG, PNG ou WebP.`);
  }
  try {
    // from-image aplica a orientação EXIF (foto de celular deitada).
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Não deu pra ler a imagem "${file.name}".`);
  }
}

function toJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
  // Recorte da origem: x, y, largura e altura.
  source: [number, number, number, number],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("O navegador não conseguiu processar a imagem.");

  // JPEG não tem transparência: PNG transparente ganha fundo branco.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, ...source, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("O navegador não conseguiu processar a imagem.")),
      IMAGE_OUTPUT_TYPE,
      quality,
    );
  });
}

// Imagem de post: até 1080 px de largura, sem nunca ampliar.
export async function resizePostImage(file: File): Promise<Blob> {
  const bitmap = await decode(file);
  const scale = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  return toJpeg(bitmap, width, height, IMAGE_QUALITY, [
    0,
    0,
    bitmap.width,
    bitmap.height,
  ]);
}

// Foto do cliente: quadrado recortado no centro.
export async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await decode(file);
  const side = Math.min(bitmap.width, bitmap.height);
  return toJpeg(bitmap, AVATAR_SIZE, AVATAR_SIZE, AVATAR_QUALITY, [
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
  ]);
}
