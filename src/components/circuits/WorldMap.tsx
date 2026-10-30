import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LAND, WORLD } from '@/lib/worldMask';
import { colors, radius } from '@/ui/theme';

export type MapPoint = { id: string; lat: number; lon: number; label: string };
type Cluster = { key: string; x: number; y: number; points: MapPoint[] };

const SPAN = WORLD.top - WORLD.bottom;
const xPct = (lon: number) => ((lon + 180) / 360) * 100;
const yPct = (lat: number) => ((WORLD.top - lat) / SPAN) * 100;

/** Agrupa pinos próximos (≈10°) para manter alvos de toque utilizáveis na Europa. */
export function clusterPoints(points: MapPoint[], deg = 10): Cluster[] {
  // Guloso por distância ao centro do grupo: vizinhos nunca ficam sobrepostos em grupos diferentes.
  const groups: { lat: number; lon: number; points: MapPoint[] }[] = [];
  for (const p of [...points].sort((a, b) => a.lon - b.lon || a.lat - b.lat)) {
    const g = groups.find((x) => Math.hypot(x.lat - p.lat, x.lon - p.lon) <= deg);
    if (!g) { groups.push({ lat: p.lat, lon: p.lon, points: [p] }); continue; }
    g.points.push(p);
    g.lat = g.points.reduce((n, q) => n + q.lat, 0) / g.points.length;
    g.lon = g.points.reduce((n, q) => n + q.lon, 0) / g.points.length;
  }
  return groups.map((g) => ({ key: g.points.map((p) => p.id).join('|'), x: xPct(g.lon), y: yPct(g.lat), points: g.points }));
}

// Matriz de pontos em meia resolução (~430 Views), calculada uma vez.
const DOTS: { x: number; y: number }[] = [];
LAND.forEach((runs, r) => {
  if (r % 2) return;
  for (const [c, len] of runs) for (let k = c + (c % 2); k < c + len; k += 2) DOTS.push({ x: ((k + 1) / WORLD.cols) * 100, y: ((r + 1) / WORLD.rows) * 100 });
});
const Land = memo(() => (
  <>
    {DOTS.map((d) => (
      <View key={`${d.x}-${d.y}`} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: 4, height: 4, marginLeft: -2, marginTop: -2, borderRadius: 2, backgroundColor: '#454558' }} />
    ))}
  </>
));

/** Mapa esquemático em matriz de pontos, sem módulo nativo; pinos com halo e contagem por grupo. */
export function WorldMap({ points, onSelect, caption }: { points: MapPoint[]; onSelect: (points: MapPoint[]) => void; caption?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const clusters = clusterPoints(points.filter((p) => p.lat <= WORLD.top && p.lat >= WORLD.bottom));
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
      <View style={{ width: '100%', aspectRatio: WORLD.cols / WORLD.rows }}>
        <Land />
        {clusters.map((c) => {
          const many = c.points.length > 1, on = active === c.key, tone = on ? colors.gold : colors.red;
          return (
            <Pressable key={c.key} accessibilityRole="button" hitSlop={10}
              accessibilityLabel={many ? `${c.points.length} pistas: ${c.points.map((p) => p.label).join(', ')}` : c.points[0].label}
              onPress={() => { setActive(c.key); onSelect(c.points); }}
              style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, width: 28, height: 28, marginLeft: -14, marginTop: -14, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: on ? 28 : 20, height: on ? 28 : 20, borderRadius: 14, backgroundColor: tone, opacity: 0.22 }} />
              <View style={{ minWidth: many ? 20 : 10, height: many ? 20 : 10, borderRadius: 10, paddingHorizontal: many ? 4 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: tone }}>
                {many ? <Text style={{ color: on ? colors.bg : colors.text, fontSize: 11, fontWeight: '800', lineHeight: 14 }}>{c.points.length}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red }} />
        <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>{caption ?? `${points.length} pistas · toque em um pino`}</Text>
      </View>
    </View>
  );
}

/** Ficha das pistas do pino selecionado, no padrão de cartões do app. */
export function MapSheet({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: colors.card2, borderRadius: radius, borderLeftWidth: 4, borderLeftColor: colors.red, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 }}>{children}</View>;
}
