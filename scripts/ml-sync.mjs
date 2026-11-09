// Sincroniza el catálogo con Mercado Libre (API oficial, credenciales en .env.local).
//   node scripts/ml-sync.mjs          → solo reporta diferencias (no escribe nada)
//   node scripts/ml-sync.mjs --apply  → aplica precios y estado a data/catalog.ts
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const APPLY = process.argv.includes('--apply');

const tokRes = await fetch('https://api.mercadolibre.com/oauth/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.ML_APP_ID, client_secret: env.ML_CLIENT_SECRET }),
});
const { access_token } = await tokRes.json();
if (!access_token) { console.error('No se pudo obtener token'); process.exit(1); }

const src = fs.readFileSync('data/catalog.ts', 'utf8');
const ids = [...src.matchAll(/^\s{4}id: "(MCO\d+)",/gm)].map((m) => m[1]);
const local = {};
for (const id of ids) {
  const blk = src.slice(src.indexOf(`id: "${id}"`)).split(/\r?\n  \},?\r?\n/)[0];
  local[id] = { name: blk.match(/name: "([^"]*)"/)?.[1], price: +blk.match(/price: (\d+)/)?.[1], activo: !/activo: false/.test(blk) };
}

const remote = {};
for (let i = 0; i < ids.length; i += 20) {
  const chunk = ids.slice(i, i + 20);
  const r = await fetch(`https://api.mercadolibre.com/items?ids=${chunk.join(',')}&attributes=id,title,price,original_price,available_quantity,sold_quantity,status`, { headers: { authorization: `Bearer ${access_token}` } });
  for (const e of await r.json()) if (e.code === 200) remote[e.body.id] = e.body; else console.warn('sin datos', e.body?.id ?? '', e.code);
}

const changes = [];
for (const id of ids) {
  const l = local[id], r = remote[id];
  if (!r) continue;
  const c = { id, name: l.name };
  if (r.price !== l.price) {
    const ratio = r.price / l.price;
    if (ratio > 3 || ratio < 0.33) console.warn('REVISAR (salto de precio sospechoso, no se aplica):', id, l.name, l.price, '→', r.price);
    else c.price = [l.price, r.price];
  }
  const activo = r.status === 'active' && r.available_quantity > 0;
  if (activo !== l.activo) c.activo = [l.activo, activo];
  if (Object.keys(c).length > 2) changes.push(c);
}
console.log(`Catálogo: ${ids.length} | consultados en ML: ${Object.keys(remote).length} | con cambios: ${changes.length}`);
for (const c of changes) console.log(c.id, c.name, c.price ? `precio ${c.price[0]} → ${c.price[1]}` : '', c.activo ? `activo ${c.activo[0]} → ${c.activo[1]}` : '');

if (APPLY && changes.length) {
  let out = src;
  for (const c of changes) {
    const start = out.indexOf(`id: "${c.id}"`);
    const end = out.indexOf('\n  },', start);
    let blk = out.slice(start, end);
    if (c.price) blk = blk.replace(/price: \d+/, `price: ${c.price[1]}`);
    if (c.activo) {
      blk = blk.replace(/\n\s+activo: (true|false),/, '');
      if (!c.activo[1]) blk = blk.replace(/(price: \d+,)/, '$1\n    activo: false,');
    }
    out = out.slice(0, start) + blk + out.slice(end);
  }
  fs.writeFileSync('data/catalog.ts', out);
  console.log('Aplicado a data/catalog.ts');
}
