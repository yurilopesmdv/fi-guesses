// Gera o SVG do mapa-base (Natural Earth 50m land, domínio público) nas cores do tema.
// Uso: node scripts/gen-world-map.mjs ne_50m_land.geojson saida.svg; renderizar o SVG em 1440px no navegador e salvar como assets/images/world-map.png
// A projeção (equirretangular, lat 80 → -61) deve bater com WORLD em src/components/circuits/WorldMap.tsx.
import { readFileSync, writeFileSync } from 'node:fs';
const W = 1440, TOP = 80, BOTTOM = -61, H = Math.round((W * (TOP - BOTTOM)) / 360);
const x = (lon) => (((lon + 180) / 360) * W).toFixed(1), y = (lat) => (((TOP - lat) / (TOP - BOTTOM)) * H).toFixed(1);
const polys = JSON.parse(readFileSync(process.argv[2], 'utf8')).features.flatMap((f) => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
const d = polys.map((p) => p.map((ring) => 'M' + ring.map(([lo, la]) => `${x(lo)},${y(la)}`).join('L') + 'Z').join('')).join('');
const grid = [];
for (let lon = -150; lon <= 150; lon += 30) grid.push(`M${x(lon)},0V${H}`);
for (let lat = 60; lat >= -60; lat -= 30) grid.push(`M0,${y(lat)}H${W}`);
writeFileSync(process.argv[3], `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="o" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1b1b26"/><stop offset="1" stop-color="#121219"/></radialGradient>
<linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34344a"/><stop offset="1" stop-color="#262636"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#o)"/>
<path d="${grid.join('')}" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1.2" fill="none"/>
<path d="${d}" fill="url(#l)" stroke="#4a4a63" stroke-width="1" stroke-linejoin="round"/>
</svg>`);
console.log(W, H);
