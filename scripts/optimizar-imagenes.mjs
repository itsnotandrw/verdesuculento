/**
 * Prepara las fotos de los productos para servirlas sin trabajo del servidor.
 *
 * Por cada /public/images/productos/<id>/<n>.jpg genera <n>-w384.webp, <n>-w768.webp y <n>-w1280.webp (el cargador
 * de lib/image-loader.ts elige el tamaño que hace falta) y, para la primera foto, <n>-og.jpg de 1200 px para
 * compartir en redes. Con --borrar-originales elimina los .jpg que ya tienen sus versiones.
 *
 * Uso: node scripts/optimizar-imagenes.mjs [--borrar-originales]
 */
import sharp from 'sharp';
import { readdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('public/images/productos');
const ANCHOS = [384, 768, 1280];
const borrar = process.argv.includes('--borrar-originales');

let hechas = 0, saltadas = 0, antes = 0, despues = 0, borradas = 0;
const carpetas = (await readdir(RAIZ, { withFileTypes: true })).filter((d) => d.isDirectory());

for (const c of carpetas) {
  const dir = path.join(RAIZ, c.name);
  for (const archivo of await readdir(dir)) {
    const m = archivo.match(/^(\d+)\.(jpg|jpeg|png)$/i);
    if (!m) continue;
    const origen = path.join(dir, archivo);
    antes += (await stat(origen)).size;
    const n = m[1];
    let completo = true;
    for (const w of ANCHOS) {
      const destino = path.join(dir, `${n}-w${w}.webp`);
      if (existsSync(destino)) { despues += (await stat(destino)).size; continue; }
      await sharp(origen).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(destino);
      despues += (await stat(destino)).size;
      hechas++;
    }
    if (n === '1') {
      const og = path.join(dir, '1-og.jpg');
      if (!existsSync(og)) await sharp(origen).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(og);
    }
    if (borrar && completo) { await unlink(origen); borradas++; } else saltadas++;
  }
}
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
console.log(`variantes nuevas: ${hechas} | originales: ${mb(antes)} | variantes totales: ${mb(despues)} | originales borrados: ${borradas}`);
