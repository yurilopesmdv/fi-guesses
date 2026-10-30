import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { flag } from '@/lib/format';
import { getDriverRivalryCircuits, type RivalryCircuits } from '@/lib/repo';
import { Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Quem chegou à frente em cada pista, em todos os GPs em comum (qualquer equipe). */
export function RivalryByCircuit({ a, b, colorA, colorB: rawB }: { a: string; b: string; colorA: string; colorB: string }) {
  const colorB = rawB === colorA ? '#3B82F6' : rawB;
  const [data, setData] = useState<RivalryCircuits | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    getDriverRivalryCircuits(a, b).then((v) => { if (active) setData(v); }).catch(() => {});
    return () => { active = false; };
  }, [a, b]);
  if (!data?.races) return null;
  const rows = all ? data.circuits : data.circuits.slice(0, 6);
  return (
    <View style={{ marginTop: 16 }}>
      <Muted style={{ fontSize: 12, marginBottom: 6 }}>EM TODOS OS GPS EM COMUM · POR PISTA</Muted>
      <Row style={{ marginBottom: 8 }}>
        <Text style={{ color: colorA, fontWeight: '900', fontSize: 20 }}>{data.a}</Text>
        <Muted style={{ flex: 1, textAlign: 'center' }}>{data.races} GPs juntos, qualquer equipe</Muted>
        <Text style={{ color: colorB, fontWeight: '900', fontSize: 20 }}>{data.b}</Text>
      </Row>
      {rows.map((c) => (
        <Pressable key={c.circuit_id} accessibilityRole="button" accessibilityLabel={`${c.name}: ${c.a} a ${c.b}`} onPress={() => router.push(`/circuit/${c.circuit_id}`)}
          style={{ minHeight: 40, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border, gap: 4 }}>
          <Row>
            <Text style={{ color: colorA, fontWeight: '800', width: 24, fontVariant: ['tabular-nums'] }}>{c.a}</Text>
            <Text style={{ flex: 1, color: colors.text, fontSize: 13, textAlign: 'center' }} numberOfLines={1}>{flag(c.country)} {c.name}</Text>
            <Text style={{ color: colorB, fontWeight: '800', width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{c.b}</Text>
          </Row>
          <View style={{ flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.card2 }}>
            <View style={{ flex: c.a, backgroundColor: colorA }} /><View style={{ flex: c.b, backgroundColor: colorB }} />
          </View>
        </Pressable>
      ))}
      {data.circuits.length > 6 && (
        <Pressable accessibilityRole="button" onPress={() => setAll(!all)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>{all ? 'Mostrar menos' : `Ver as ${data.circuits.length} pistas`}</Text>
        </Pressable>
      )}
    </View>
  );
}
