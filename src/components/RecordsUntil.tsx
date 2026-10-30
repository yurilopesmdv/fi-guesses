import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecordsUntil, type RecordKind, type RecordsUntil as Data } from '@/lib/repo';
import { SEASON } from '@/lib/useSeason';
import { Card, H2, Loading, Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const KINDS: { kind: RecordKind; label: string }[] = [{ kind: 'wins', label: 'Vitórias' }, { kind: 'podiums', label: 'Pódios' }, { kind: 'starts', label: 'Largadas' }, { kind: 'p1', label: 'P1 no grid' }];
const JUMPS = [1960, 1980, 2000, 2010];

/** Recordes acumulados até o fim de um ano (H19): como a lista estava naquela época. */
export function RecordsUntil() {
  const [year, setYear] = useState(2000);
  const [kind, setKind] = useState<RecordKind>('wins');
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    const t = setTimeout(() => getRecordsUntil(year).then((v) => { if (active) setData(v ?? {}); }).catch(() => { if (active) setData({}); }), 200);
    return () => { active = false; clearTimeout(t); };
  }, [year]);
  const rows = data?.[kind] ?? [];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const step = (d: number) => setYear((y) => Math.min(SEASON, Math.max(1950, y + d)));
  return (
    <>
      <H2 style={{ marginTop: 20 }}>Recordes até {year}</H2>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ano anterior" onPress={() => step(-1)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="remove-circle-outline" size={26} color={colors.text} /></Pressable>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{year}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo ano" onPress={() => step(1)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add-circle-outline" size={26} color={colors.text} /></Pressable>
        </Row>
        <Row style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          {[...JUMPS, SEASON].map((y) => (
            <Pressable key={y} accessibilityRole="button" onPress={() => setYear(y)} style={{ minHeight: 32, paddingHorizontal: 10, borderRadius: 16, justifyContent: 'center', backgroundColor: y === year ? colors.red : colors.card2 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{y === SEASON ? 'Hoje' : y}</Text>
            </Pressable>
          ))}
        </Row>
        <Row style={{ gap: 6, marginBottom: 6 }}>
          {KINDS.map((k) => (
            <Pressable key={k.kind} accessibilityRole="button" accessibilityState={{ selected: k.kind === kind }} onPress={() => setKind(k.kind)}
              style={{ flex: 1, minHeight: 34, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: k.kind === kind ? colors.red : colors.border, backgroundColor: k.kind === kind ? '#28161c' : 'transparent' }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{k.label}</Text>
            </Pressable>
          ))}
        </Row>
        {!data ? <Loading /> : !rows.length ? <Muted>Sem registros até este ano.</Muted> : rows.map((r) => (
          <Pressable key={r.driver_id} accessibilityRole="button" accessibilityLabel={`${r.rank}º ${r.name}: ${r.value}`} onPress={() => router.push(`/driver/${r.driver_id}`)} style={{ minHeight: 44, justifyContent: 'center', gap: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Row>
              <Text style={{ width: 28, color: r.rank === 1 ? colors.gold : colors.muted, fontWeight: '800' }}>{r.rank}º</Text>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }} numberOfLines={1}>{r.name ?? r.driver_id}</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{r.value}</Text>
            </Row>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.card2, marginLeft: 28 }}><View style={{ height: 4, borderRadius: 2, width: `${(100 * r.value) / max}%`, backgroundColor: r.rank === 1 ? colors.gold : colors.red }} /></View>
          </Pressable>
        ))}
        <Muted style={{ fontSize: 11, marginTop: 8 }}>Totais de GPs disputados até o fim de {year}. Empates dividem a posição.</Muted>
      </Card>
    </>
  );
}
