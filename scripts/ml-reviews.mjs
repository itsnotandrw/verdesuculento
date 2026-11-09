// Trae reseñas REALES con foto de los compradores desde Mercado Libre y deja:
//   - public/images/resenas/<id>.webp   (foto optimizada, copia local)
//   - data/resenas.ts                    (texto, estrellas, fecha, producto)
// Uso:  node scripts/ml-reviews.mjs [cantidad=8]
// Requiere ML_APP_ID y ML_CLIENT_SECRET en .env.local. La API no entrega nombres de compradores.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const CANTIDAD = Number(process.argv[2] ?? 8);
const MAX_POR_PRODUCTO = 2;
const MIN_CARACTERES = 25;

const ids = [...fs.readFileSync('data/ratings.ts', 'utf8').matchAll(/"(MCO\d+)":/g)].map((m) => m[1]);
const tok = await (await fetch('https://api.mercadolibre.com/oauth/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.ML_APP_ID, client_secret: process.env.ML_CLIENT_SECRET }),
})).json();
const H = { Authorization: 'Bearer ' + tok.access_token };

const candidatas = [];
for (const productId of ids) {
  for (let off = 0; off < 200; off += 50) {
    const r = await fetch(`https://api.mercadolibre.com/reviews/item/${productId}?limit=50&offset=${off}`, { headers: H });
    if (!r.ok) break;
    const j = await r.json();
    for (const rv of j.reviews ?? []) {
      const foto = (rv.media ?? []).find((m) => m.type === 'photo' && m.status === 'published' && m.variations?.length);
      const texto = (rv.content ?? '').replace(/\s+/g, ' ').trim();
      if (!foto || rv.status !== 'published' || rv.rate < 4 || texto.length < MIN_CARACTERES) continue;
      candidatas.push({
        id: String(rv.id), productId, rating: rv.rate, titulo: (rv.title ?? '').trim(), contenido: texto,
        fecha: rv.date_created, likes: rv.likes ?? 0, url: foto.variations[0].url,
        score: rv.rate * 10 + (rv.likes ?? 0) * 2 + Math.min(texto.length, 140) / 20,
      });
    }
    if (off + 50 >= (j.paging?.total_pageable ?? 0)) break;
  }
}
candidatas.sort((a, b) => b.score - a.score);

const porProducto = {};
const elegidas = [];
for (const c of candidatas) {
  if ((porProducto[c.productId] ?? 0) >= MAX_POR_PRODUCTO) continue;
  porProducto[c.productId] = (porProducto[c.productId] ?? 0) + 1;
  elegidas.push(c);
  if (elegidas.length >= CANTIDAD) break;
}

const dir = 'public/images/resenas';
fs.mkdirSync(dir, { recursive: true });
const salida = [];
for (const c of elegidas) {
  const buf = Buffer.from(await (await fetch(c.url)).arrayBuffer());
  const out = await sharp(buf).rotate().resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, `${c.id}.webp`));
  salida.push({ id: c.id, productId: c.productId, rating: c.rating, titulo: c.titulo, contenido: c.contenido, fecha: c.fecha, foto: `/images/resenas/${c.id}.webp`, ancho: out.width, alto: out.height });
  console.log(c.productId, c.rating, c.contenido.slice(0, 60));
}

const ts = `// Generado por scripts/ml-reviews.mjs a partir de reseñas reales de compradores en Mercado Libre.
// No editar a mano: volver a correr el script. La API no entrega nombres, solo el texto, las estrellas y la foto.
export interface Resena {
  id: string;
  productId: string;
  rating: number;
  titulo: string;
  contenido: string;
  fecha: string;
  foto: string;
  ancho: number;
  alto: number;
}

export const RESENAS: Resena[] = ${JSON.stringify(salida, null, 2)};
`;
fs.writeFileSync('data/resenas.ts', ts);
console.log(`\n${candidatas.length} candidatas con foto; guardadas ${salida.length}.`);
