// Genera versiones con fondo TRANSPARENTE (WebP, misma resolución) de la primera foto de cada producto
// cuando esa foto tiene fondo blanco. Se usan en modo oscuro (ProductCard). Las originales no se tocan.
//   node scripts/make-cutouts.mjs
// Técnica: (1) se marcan las zonas casi blancas conectadas con el borde o grandes; (2) esas zonas pasan
// a transparentes; (3) en el contorno (2 px) se recalcula la transparencia y se QUITA el tinte blanco
// del color ("color to alpha"), así no queda halo blanco ni pixelado. Interior de la foto intacto.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
sharp.cache(false);

const ROOT = 'public/images/productos';
const T = 236; // canal mínimo >= T => "casi blanco"
const MIN_REGION = 0.0006; // fracción del área para que una zona blanca NO conectada al borde también se quite

const ids = fs.readdirSync(ROOT).filter((d) => /^MCO\d+$/.test(d));
const hechos = [];
const omitidos = [];

for (const id of ids) {
  const src = path.join(ROOT, id, '1.jpg');
  if (!fs.existsSync(src)) continue;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const px = (i) => i * 4;
  const white = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = px(i);
    white[i] = Math.min(data[o], data[o + 1], data[o + 2]) >= T ? 1 : 0;
  }

  // ¿el borde es blanco? si no, es una foto real: se omite
  let borde = 0, total = 0;
  for (let x = 0; x < w; x++) { borde += white[x] + white[(h - 1) * w + x]; total += 2; }
  for (let y = 0; y < h; y++) { borde += white[y * w] + white[y * w + w - 1]; total += 2; }
  if (borde / total < 0.6) { omitidos.push(id); continue; }

  // componentes conexas de "blanco"
  const comp = new Int32Array(n).fill(-1);
  const remove = new Uint8Array(n);
  const stack = new Int32Array(n);
  let nc = 0;
  for (let s = 0; s < n; s++) {
    if (!white[s] || comp[s] !== -1) continue;
    let sp = 0, size = 0, toca = false;
    const members = [];
    stack[sp++] = s; comp[s] = nc;
    while (sp) {
      const p = stack[--sp];
      members.push(p); size++;
      const x = p % w, y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) toca = true;
      if (x > 0 && white[p - 1] && comp[p - 1] === -1) { comp[p - 1] = nc; stack[sp++] = p - 1; }
      if (x < w - 1 && white[p + 1] && comp[p + 1] === -1) { comp[p + 1] = nc; stack[sp++] = p + 1; }
      if (y > 0 && white[p - w] && comp[p - w] === -1) { comp[p - w] = nc; stack[sp++] = p - w; }
      if (y < h - 1 && white[p + w] && comp[p + w] === -1) { comp[p + w] = nc; stack[sp++] = p + w; }
    }
    if (toca || size >= MIN_REGION * n) for (const p of members) remove[p] = 1;
    nc++;
  }

  // banda de contorno: hasta 2 px alrededor de lo removido
  let band = new Uint8Array(n);
  let frontier = remove;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (remove[p] || band[p]) continue;
      let cerca = false;
      for (let dy = -1; dy <= 1 && !cerca; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (frontier[q] || (pass > 0 && band[q])) { cerca = true; break; }
      }
      if (cerca) next[p] = 1;
    }
    for (let i = 0; i < n; i++) if (next[i]) band[i] = 1;
    frontier = remove;
  }

  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const o = px(i);
    if (remove[i]) { out[o] = out[o + 1] = out[o + 2] = 0; out[o + 3] = 0; continue; }
    let r = data[o], g = data[o + 1], b = data[o + 2], a = 255;
    if (band[i]) {
      const m = Math.min(r, g, b);
      const al = Math.max(0, Math.min(1, (255 - m) / 120));
      if (al < 1) {
        const inv = 1 / Math.max(al, 0.02);
        r = Math.max(0, Math.min(255, (r - (1 - al) * 255) * inv));
        g = Math.max(0, Math.min(255, (g - (1 - al) * 255) * inv));
        b = Math.max(0, Math.min(255, (b - (1 - al) * 255) * inv));
        a = Math.round(al * 255);
      }
    }
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
  }

  const dir = path.join(ROOT, id, 'cut');
  fs.mkdirSync(dir, { recursive: true });
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 94, alphaQuality: 100, effort: 5 })
    .toFile(path.join(dir, '1.webp'));
  hechos.push(id);
}

fs.writeFileSync(
  'data/cutouts.ts',
  `// GENERADO por scripts/make-cutouts.mjs — productos cuya primera foto tiene versión con fondo transparente\n` +
    `// (public/images/productos/<id>/cut/1.webp). No editar a mano.\n` +
    `export const CUTOUTS = new Set<string>([\n${hechos.map((id) => `  '${id}',`).join('\n')}\n]);\n`,
);
console.log(`Con recorte: ${hechos.length} | foto real (omitidas): ${omitidos.length}`);
