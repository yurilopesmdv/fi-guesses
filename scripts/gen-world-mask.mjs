// Gera src/lib/worldMask.ts a partir do Natural Earth 110m land (domínio público).
// Uso: node scripts/gen-world-mask.mjs caminho/ne_110m_land.geojson
import { readFileSync, writeFileSync } from 'node:fs';
const COLS = 120, TOP = 80, BOTTOM = -61, STEP = 360 / COLS, ROWS = Math.round((TOP - BOTTOM) / STEP);
const polys = JSON.parse(readFileSync(process.argv[2], 'utf8')).features.flatMap((f) =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const inside = (x, y, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const land = (x, y) => polys.some((p) => inside(x, y, p[0]) && !p.slice(1).some((h) => inside(x, y, h)));
const rows = [];
for (let r = 0; r < ROWS; r++) {
  const y = TOP - (r + 0.5) * STEP, runs = [];
  for (let c = 0; c < COLS; c++) {
    if (!land(-180 + (c + 0.5) * STEP, y)) continue;
    const last = runs[runs.length - 1];
    if (last && last[0] + last[1] === c) last[1]++; else runs.push([c, 1]);
  }
  rows.push(runs);
}
writeFileSync('src/lib/worldMask.ts', `// Gerado por scripts/gen-world-mask.mjs (Natural Earth 110m land, domínio público). Não editar à mão.
export const WORLD = { cols: ${COLS}, rows: ${ROWS}, top: ${TOP}, bottom: ${BOTTOM} } as const;
/** Por linha: segmentos [coluna inicial, comprimento] de terra. */
export const LAND: readonly (readonly [number, number])[][] = ${JSON.stringify(rows)};
`);
console.log(ROWS, rows.flat().length, 'segmentos');
