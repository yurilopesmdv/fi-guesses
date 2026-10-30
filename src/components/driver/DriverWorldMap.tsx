import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { MapSheet, WorldMap, type MapPoint } from '@/components/circuits/WorldMap';
import { InsightDetails } from '@/components/insights/InsightUI';
import { flag } from '@/lib/format';
import { getDriverCircuitMap, type DriverCircuitPoint } from '@/lib/repo';
import { Muted, P } from '@/ui/primitives';

/** Pódios do piloto pelo mundo; carregado só ao abrir para não pesar o perfil. */
export function DriverWorldMap({ driverId }: { driverId: string }) {
  const [rows, setRows] = useState<DriverCircuitPoint[] | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<MapPoint[]>([]);
  const open = (v: boolean) => { if (v && !rows) getDriverCircuitMap(driverId).then(setRows).catch(() => setError('Não foi possível carregar o mapa.')); };
  const points = (rows ?? []).flatMap((r) => r.latitude != null && r.longitude != null ? [{ id: r.id, lat: r.latitude, lon: r.longitude, label: `${r.name}: ${r.wins} vitória(s), ${r.podiums} pódio(s)` }] : []);
  return (
    <InsightDetails title="🗺️ Vitórias e pódios pelo mundo" onOpenChange={open}>
      {error ? <Muted>{error}</Muted> : !rows ? <Muted>Carregando…</Muted> : !rows.length ? <Muted>Sem pódios registrados.</Muted> : <>
        <WorldMap points={points} onSelect={setPicked} caption={`${rows.length} pistas com pódio · toque em um pino`} />
        {picked.map((p) => {
          const r = rows.find((x) => x.id === p.id)!;
          return (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Abrir ${r.name}`} onPress={() => router.push(`/circuit/${r.id}`)}>
              <MapSheet>
                <P style={{ fontWeight: '800' }}>{flag(r.country)} {r.name} · {r.wins}V / {r.podiums}P ›</P>
                <Muted style={{ fontSize: 12 }}>{r.results.map((x) => `${x.season} P${x.position}`).join(' · ')}</Muted>
              </MapSheet>
            </Pressable>
          );
        })}
      </>}
    </InsightDetails>
  );
}
