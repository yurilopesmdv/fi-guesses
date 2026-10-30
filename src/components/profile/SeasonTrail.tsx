import { Text, View } from 'react-native';
import type { ProfilePoolSummary } from '@/lib/types';
import { H2, Muted } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Trajetória por temporada (P09): bolões, melhor posição e aproveitamento apurado. Cada bolão conta separado. */
export function SeasonTrail({ pools }: { pools: ProfilePoolSummary[] }) {
  const seasons = [...new Set(pools.map((p) => p.season))].sort((a, b) => b - a);
  if (seasons.length < 1) return null;
  const rows = seasons.map((s) => {
    const list = pools.filter((p) => p.season === s);
    const max = list.reduce((n, p) => n + p.max_points, 0), earned = list.reduce((n, p) => n + p.earned_points, 0);
    return { s, n: list.length, best: Math.min(...list.map((p) => p.rank)), titles: list.filter((p) => p.status === 'finished' && p.rank === 1).length,
      live: list.some((p) => p.status !== 'finished'), pct: max ? Math.round((100 * earned) / max) : null };
  });
  return (
    <View style={{ marginBottom: 16 }}>
      <H2>Sua trajetória</H2>
      <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}>
        {rows.map((r, i) => (
          <View key={r.s} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ alignItems: 'center', width: 48 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, fontVariant: ['tabular-nums'] }}>{r.s}</Text>
              {r.live ? <Text style={{ color: colors.green, fontSize: 10, fontWeight: '700' }}>em curso</Text> : null}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{r.n} {r.n > 1 ? 'bolões' : 'bolão'} · melhor {r.best}º{r.titles ? ` · 🏆 ${r.titles}` : ''}</Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.card2 }}><View style={{ height: 5, borderRadius: 3, width: `${r.pct ?? 0}%`, backgroundColor: colors.gold }} /></View>
            </View>
            <Text style={{ color: colors.gold, fontWeight: '800', width: 44, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{r.pct == null ? '—' : `${r.pct}%`}</Text>
          </View>
        ))}
      </View>
      <Muted style={{ fontSize: 11, marginTop: 6 }}>Barra: aproveitamento nas perguntas apuradas da temporada. Melhor posição considera o ranking atual de cada bolão.</Muted>
    </View>
  );
}
