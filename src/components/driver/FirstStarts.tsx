import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getDriverFirstStarts, type FirstStarts } from '@/lib/repo';
import { Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const SIZES = [25, 50, 100] as const;

/** Mesmo ponto de partida: as primeiras N largadas de cada um (H12). */
export function FirstStartsCompare({ a, b, colorA, colorB: rawB }: { a: string; b: string; colorA: string; colorB: string }) {
  const colorB = rawB === colorA ? '#3B82F6' : rawB;
  const [n, setN] = useState<(typeof SIZES)[number]>(50);
  const [data, setData] = useState<Record<string, FirstStarts> | null>(null);
  useEffect(() => {
    let active = true;
    getDriverFirstStarts(a, b, n).then((v) => { if (active) setData(v); }).catch(() => {});
    return () => { active = false; };
  }, [a, b, n]);
  const A = data?.[a], B = data?.[b];
  if (!A || !B) return null;
  const rows: [string, number, number][] = [['Vitórias', A.wins, B.wins], ['Pódios', A.podiums, B.podiums], ['Pontos', Number(A.points), Number(B.points)], ['Largou em P1', A.p1_starts, B.p1_starts]];
  return (
    <View style={{ marginTop: 16 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Muted style={{ fontSize: 12 }}>PRIMEIRAS LARGADAS</Muted>
        <Row style={{ gap: 6 }}>
          {SIZES.map((s) => (
            <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: s === n }} onPress={() => setN(s)}
              style={{ minHeight: 32, minWidth: 44, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: s === n ? colors.red : colors.card2 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{s}</Text>
            </Pressable>
          ))}
        </Row>
      </Row>
      {rows.map(([label, x, y]) => (
        <Row key={label} style={{ minHeight: 34, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ width: 56, color: x > y ? colorA : colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{x.toLocaleString('pt-BR')}</Text>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12 }}>{label}</Text>
          <Text style={{ width: 56, textAlign: 'right', color: y > x ? colorB : colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{y.toLocaleString('pt-BR')}</Text>
        </Row>
      ))}
      <Muted style={{ fontSize: 11, marginTop: 4 }}>
        {A.starts < n || B.starts < n ? `Amostra: ${A.starts} e ${B.starts} largadas. ` : ''}Até {A.until} e {B.until}. Pontos pela regra de cada época; desistências antes da largada não contam.
      </Muted>
    </View>
  );
}
