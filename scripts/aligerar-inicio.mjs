// Genera las versiones livianas del logo y del banner fijo, y reduce las fotos de categorías. Uso: node scripts/aligerar-inicio.mjs
import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'fs/promises';

for (const w of [96, 192]) await sharp('public/logo-icon.png').resize(w, w).webp({ quality: 90 }).toFile(`public/logo-icon-w${w}.webp`);
for (const w of [768, 1280]) await sharp('public/promos/black-friday-30.jpeg').resize(w).webp({ quality: 74 }).toFile(`public/promos/black-friday-30-w${w}.webp`);

const dir = 'public/images/categorias';
for (const f of await readdir(dir)) {
  const original = await readFile(`${dir}/${f}`);
  const { width } = await sharp(original).metadata();
  if (width <= 600) continue; // ya reducida
  await writeFile(`${dir}/${f}`, await sharp(original).resize(600).webp({ quality: 68 }).toBuffer());
}
