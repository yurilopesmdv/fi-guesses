import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/ui/theme';

export type MapPoint = { id: string; lat: number; lon: number; label: string };
type Cluster = { key: string; x: number; y: number; points: MapPoint[] };

// Mesma projeção de scripts/gen-world-map.mjs (equirretangular, lat 80 → -61, 1440×564).
const WORLD = { top: 80, bottom: -61, ratio: 1440 / 564 };
const SPAN = WORLD.top - WORLD.bottom;
const xPct = (lon: number) => ((lon + 180) / 360) * 100;
const yPct = (lat: number) => ((WORLD.top - lat) / SPAN) * 100;
const BASE = require('../../../assets/images/world-map.png');

const REGIONS = [
  { id: 'world', label: 'Mundo', lon: [-180, 180], lat: [80, -61] },
  { id: 'europe', label: 'Europa', lon: [-14, 34], lat: [62, 33] },
  { id: 'americas', label: 'Américas', lon: [-128, -32], lat: [58, -45] },
  { id: 'asia', label: 'Ásia e Oceania', lon: [38, 178], lat: [48, -46] },
] as const;

/** Agrupa pinos próximos (graus) de forma gulosa: vizinhos nunca ficam sobrepostos em grupos diferentes. */
export function clusterPoints(points: MapPoint[], deg: number): Cluster[] {
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

/** Mapa-base estático (sem módulo nativo) com pinos, atalhos de região e agrupamento por zoom. */
export function WorldMap({ points, onSelect, caption }: { points: MapPoint[]; onSelect: (points: MapPoint[]) => void; caption?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<(typeof REGIONS)[number]['id']>('world');
  const region = REGIONS.find((r) => r.id === regionId)!;
  // Contêiner com a proporção da região (mín. 1,4); a imagem escala e desloca. Margens % em RN são relativas à largura.
  const latSpan = region.lat[0] - region.lat[1];
  const viewRatio = Math.max(1.4, (region.lon[1] - region.lon[0]) / latSpan);
  const lonSpan = latSpan * viewRatio, lonMin = (region.lon[0] + region.lon[1]) / 2 - lonSpan / 2;
  const scale = 360 / lonSpan;
  const left = -(xPct(lonMin) / 100) * scale * 100;
  const top = -((yPct(region.lat[0]) / 100) * scale / WORLD.ratio) * 100;
  const clusters = clusterPoints(points.filter((p) => p.lat <= WORLD.top && p.lat >= WORLD.bottom), 18 / scale);
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: '100%', aspectRatio: viewRatio, overflow: 'hidden', backgroundColor: '#121219' }}>
        <View style={{ position: 'absolute', width: `${scale * 100}%`, aspectRatio: WORLD.ratio, marginLeft: `${left}%`, marginTop: `${top}%` }}>
          <Image source={BASE} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="fill" transition={150} accessible={false} />
          {clusters.map((c) => {
            const many = c.points.length > 1, on = active === c.key, tone = on ? colors.gold : colors.red;
            return (
              <Pressable key={c.key} accessibilityRole="button" hitSlop={10}
                accessibilityLabel={many ? `${c.points.length} pistas: ${c.points.map((p) => p.label).join(', ')}` : c.points[0].label}
                onPress={() => { setActive(c.key); onSelect(c.points); }}
                style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, width: 30, height: 30, marginLeft: -15, marginTop: -15, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: on ? 30 : 22, height: on ? 30 : 22, borderRadius: 15, backgroundColor: tone, opacity: 0.25 }} />
                <View style={{ minWidth: many ? 20 : 11, height: many ? 20 : 11, borderRadius: 10, paddingHorizontal: many ? 4 : 0, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: tone, borderWidth: 2, borderColor: '#121219' }}>
                  {many ? <Text style={{ color: on ? colors.bg : colors.text, fontSize: 11, fontWeight: '800', lineHeight: 14 }}>{c.points.length}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ padding: 10, gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {REGIONS.map((r) => (
            <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: r.id === regionId }} onPress={() => { setRegionId(r.id); setActive(null); onSelect([]); }}
              style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 17, justifyContent: 'center', backgroundColor: r.id === regionId ? colors.red : colors.card2 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{r.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{caption ?? `${points.length} pistas · toque em um pino`}</Text>
      </View>
    </View>
  );
}

/** Ficha das pistas do pino selecionado, no padrão de cartões do app. */
export function MapSheet({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: colors.card2, borderRadius: radius, borderLeftWidth: 4, borderLeftColor: colors.red, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 }}>{children}</View>;
}
