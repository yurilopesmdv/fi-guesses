import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Muted } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export type Bar = { label: string; value: number; color?: string; note?: string };

/** Gráfico de barras verticais só com Views (sem lib nativa). */
export function BarChart({ data, height = 120, max, invert = false, format = (v: number) => String(v) }: { data: Bar[]; height?: number; max?: number; invert?: boolean; format?: (v: number) => string }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const wide = data.length > 12;
  const body = (
    <View style={[s.chart, { height: height + 34 }]}>
      {data.map((d, i) => {
        const h = Math.max(3, (invert ? (top - d.value + 1) / top : d.value / top) * height);
        return (
          <View key={i} style={[s.col, { width: wide ? 26 : undefined, flex: wide ? undefined : 1 }]}>
            <Text style={s.val} numberOfLines={1}>{format(d.value)}</Text>
            <View style={{ flex: 1, justifyContent: 'flex-end', alignSelf: 'stretch', paddingHorizontal: 2 }}>
              <View style={{ height: h, borderRadius: 4, backgroundColor: d.color ?? colors.red }} />
            </View>
            <Text style={s.lbl} numberOfLines={1}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
  return wide ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{body}</ScrollView> : body;
}

/** Barras horizontais proporcionais (distribuição). */
export function HBars({ data }: { data: Bar[] }) {
  const total = Math.max(1, data.reduce((t, d) => t + d.value, 0));
  return (
    <View style={{ gap: 6 }}>
      {data.map((d, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>{d.label}</Muted>
            <Text style={{ color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{d.value}{d.note ? ` ${d.note}` : ''} · {Math.round((d.value / total) * 100)}%</Text>
          </View>
          <View style={s.track}><View style={{ width: `${(d.value / total) * 100}%`, height: 8, borderRadius: 4, backgroundColor: d.color ?? colors.red }} /></View>
        </View>
      ))}
    </View>
  );
}

/** Faixa de resultados: um quadrado por corrida (ouro/prata/bronze/pontos/sem pontos/abandono). */
export function ResultStrip({ results }: { results: { finish: number; classified: boolean; points: number; label: string }[] }) {
  const color = (r: { finish: number; classified: boolean; points: number }) =>
    !r.classified ? '#7F1D1D' : r.finish === 1 ? colors.gold : r.finish === 2 ? colors.silver : r.finish === 3 ? colors.bronze : r.points > 0 ? '#166534' : colors.card2;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
      {results.map((r, i) => (
        <View key={i} style={{ alignItems: 'center' }}>
          <View style={[s.cell, { backgroundColor: color(r) }]}><Text style={s.cellTxt}>{r.classified ? r.finish : 'X'}</Text></View>
          <Text style={s.cellLbl}>{r.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'stretch', gap: 3 },
  col: { alignItems: 'center' },
  val: { color: colors.muted, fontSize: 9, marginBottom: 2 },
  lbl: { color: colors.muted, fontSize: 9, marginTop: 3 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.card2, marginTop: 3 },
  cell: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cellTxt: { color: '#111', fontWeight: '900', fontSize: 12 },
  cellLbl: { color: colors.muted, fontSize: 8, marginTop: 2 },
});
