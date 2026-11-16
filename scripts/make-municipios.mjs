// Genera public/data/municipios.json: TODOS los municipios de Colombia con altitud aproximada (msnm).
// Fuentes: DIVIPOLA (DANE, datos.gov.co, dataset gdxc-w37w) para nombre, departamento y coordenadas;
// Open-Meteo Elevation (modelo digital de terreno Copernicus ~90 m) para la altitud en esas coordenadas.
// Los ~51 municipios principales de data/zonas.ts conservan su altitud revisada a mano.
// Uso:  node scripts/make-municipios.mjs
import fs from 'node:fs';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en']);
const titulo = (t) =>
  t.toLowerCase().split(' ').map((w, i) => (i > 0 && MINUSCULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
    .replace(/\b(D\.c\.)/i, 'D.C.');
const num = (t) => Number(String(t).replace(',', '.'));

// 1) DIVIPOLA
const filas = await (await fetch('https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=2000')).json();
console.log('DIVIPOLA:', filas.length, 'filas');
const base = filas
  .map((f) => ({ cod: f.cod_mpio, name: titulo(f.nom_mpio.replace(/\s+/g, ' ').trim()), dept: titulo(f.dpto.replace(/\s+/g, ' ').trim()), lat: num(f.latitud), lng: num(f.longitud) }))
  .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
console.log('con coordenadas:', base.length);

// 2) Altitud en lotes de 100 coordenadas (con reintentos ante límites de la API y caché para poder retomar)
const CACHE = (process.env.TEMP || '/tmp') + '/municipios-elev-cache.json';
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
for (let i = 0; i < base.length; i += 100) {
  const lote = base.slice(i, i + 100);
  const clave = lote.map((m) => m.cod).join(',');
  if (!cache[clave]) {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lote.map((m) => m.lat).join(',')}&longitude=${lote.map((m) => m.lng).join(',')}`;
    let r;
    for (let intento = 1; intento <= 8; intento++) {
      r = await fetch(url);
      if (r.ok) break;
      const espera = 20000 * intento;
      console.log(`lote ${i}: HTTP ${r.status}, reintento ${intento} en ${espera / 1000}s`);
      await new Promise((res) => setTimeout(res, espera));
    }
    if (!r.ok) throw new Error('Open-Meteo falló en el lote ' + i + ': ' + r.status);
    cache[clave] = (await r.json()).elevation;
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    await new Promise((res) => setTimeout(res, 5000));
  }
  lote.forEach((m, j) => { m.msnm = Math.round(cache[clave][j]); });
}

// 3) Valores revisados a mano de data/zonas.ts (tienen prioridad)
const zonas = fs.readFileSync('data/zonas.ts', 'utf8');
const curados = [...zonas.matchAll(/\{ name: '([^']+)', dept: '([^']+)', msnm: (\d+), lat: ([-\d.]+), lng: ([-\d.]+) \}/g)]
  .map((m) => ({ name: m[1], dept: m[2], msnm: +m[3], lat: +m[4], lng: +m[5] }));
const porNombre = new Map();
for (const m of base) (porNombre.get(norm(m.name)) ?? porNombre.set(norm(m.name), []).get(norm(m.name))).push(m);
const sinPar = [];
const dif = [];
for (const c of curados) {
  const nombre = norm(c.name.replace(/D\.C\./i, '')).replace(/ d c$/, '').trim();
  const cands = [...porNombre.entries()].filter(([k]) => k === nombre || k.startsWith(nombre + ' d c')).flatMap(([, v]) => v);
  const mismoDept = cands.find((m) => norm(m.dept).startsWith(norm(c.dept).slice(0, 6)) || (nombre === 'bogota' && m.cod === '11001'));
  const par = mismoDept ?? (cands.length === 1 ? cands[0] : null);
  if (!par) { sinPar.push(c.name + ' (' + c.dept + ')'); continue; }
  if (Math.abs(par.msnm - c.msnm) > 150) dif.push(`${c.name}: calculada ${par.msnm} vs revisada ${c.msnm}`);
  par.msnm = c.msnm; par.name = c.name; par.dept = c.dept;
  par.lat = c.lat; par.lng = c.lng;
}
console.log('Curados sin par en DIVIPOLA:', sinPar.length ? sinPar.join('; ') : 'ninguno');
console.log('Diferencias > 150 m (calculada vs revisada):', dif.length ? '\n  ' + dif.join('\n  ') : 'ninguna');

base.sort((a, b) => a.name.localeCompare(b.name, 'es') || a.dept.localeCompare(b.dept, 'es'));
const salida = base.map((m) => [m.name, m.dept, m.msnm, Math.round(m.lat * 1000) / 1000, Math.round(m.lng * 1000) / 1000]);
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/municipios.json', JSON.stringify(salida));
const mn = Math.min(...base.map((m) => m.msnm)), mx = Math.max(...base.map((m) => m.msnm));
console.log(`Guardados ${salida.length} municipios · altitud ${mn}–${mx} msnm · ${(fs.statSync('public/data/municipios.json').size / 1024).toFixed(0)} KB`);
