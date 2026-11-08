import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const DISHES_DIR = path.join(UPLOADS_DIR, 'dishes');

export async function optimizeImage(buffer) {
  const filename = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(DISHES_DIR, { recursive: true });

  try {
    await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(DISHES_DIR, filename));
  } catch {
    const error = new Error('O arquivo enviado não é uma imagem válida');
    error.statusCode = 400;
    throw error;
  }

  return `/uploads/dishes/${filename}`;
}

// Melhor esforço: nunca lança erro. basename() impede path traversal.
export async function removeImage(imageUrl) {
  try {
    await fs.unlink(path.join(DISHES_DIR, path.basename(imageUrl)));
  } catch {
    // o arquivo já não existe, não há o que fazer
  }
}