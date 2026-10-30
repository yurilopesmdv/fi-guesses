import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LAND, WORLD } from '@/lib/worldMask';
import { colors } from '@/ui/theme';

export type MapPoint = { id: string; lat: number; lon: number; label: string };
type Cluster = { key: string; x: number; y: number; points: MapPoint[] };

const SPAN = WORLD.top - WORLD.bottom;
const xPct = (lon: number) => ((lon + 180) / 360) * 100;
const yPct = (lat: number) => ((WORLD.top - lat) / SPAN) * 100;

/** Agrupa pinos próximos (≈6°) para manter alvos de toque utilizáveis na Europa. */
export function clusterPoints(points: MapPoint[], deg = 6): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const p of points) {
    const key = `${Math.round(p.lat / deg)}:${Math.round(p.lon / deg)}`;
    const c = map.get(key) ?? { key, x: 0, y: 0, points: [] };
    c.points.push(p);
    map.set(key, c);
  }
  return [...map.values()].map((c) => ({
    ...c,
    x: xPct(c.points.reduce((n, p) => n + p.lon, 0) / c.points.length),
    y: yPct(c.points.reduce((n, p) => n + p.lat, 0) / c.points.length),
  }));
}

/** Mapa esquemático equirretangular, sem módulo nativo: terra em segmentos e pinos clicáveis. */
export function WorldMap({ points, onSelect }: { points: MapPoint[]; onSelect: (points: MapPoint[]) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const clusters = clusterPoints(points.filter((p) => p.lat <= WORLD.top && p.lat >= WORLD.bottom));
  return (
    <View accessible={false} style={{ width: '100%', aspectRatio: WORLD.cols / WORLD.rows, backgroundColor: '#0f1420', borderRadius: 12, overflow: 'hidden' }}>
      {LAND.map((runs, r) => runs.map(([c, len]) => (
        <View key={`${r}-${c}`} style={{ position: 'absolute', left: `${(c / WORLD.cols) * 100}%`, top: `${(r / WORLD.rows) * 100}%`,
          width: `${(len / WORLD.cols) * 100}%`, height: `${(1 / WORLD.rows) * 100}%`, backgroundColor: '#2a3142' }} />
      )))}
      {clusters.map((c) => {
        const many = c.points.length > 1, on = active === c.key;
        return (
          <Pressable key={c.key} accessibilityRole="button" hitSlop={8}
            accessibilityLabel={many ? `${c.points.length} pistas: ${c.points.map((p) => p.label).join(', ')}` : c.points[0].label}
            onPress={() => { setActive(c.key); onSelect(c.points); }}
            style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, width: 22, height: 22, marginLeft: -11, marginTop: -11, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ minWidth: many ? 16 : 10, height: many ? 16 : 10, borderRadius: 8, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? colors.gold : colors.red, borderWidth: 1, borderColor: colors.text }}>
              {many ? <Text style={{ color: colors.text, fontSize: 9, fontWeight: '800' }}>{c.points.length}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
