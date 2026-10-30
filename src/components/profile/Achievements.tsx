import { Text, View } from 'react-native';
import { InsightDetails } from '@/components/insights/InsightUI';
import type { ProfilePoolSummary } from '@/lib/types';
import { H2, Muted } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Conquistas informativas (P08): sem pontos, prêmio ou vantagem. Títulos só com bolão finalizado; empates contam. */
export function Achievements({ pools }: { pools: ProfilePoolSummary[] }) {
  const finished = pools.filter((p) => p.status === 'finished');
  const titles = finished.filter((p) => p.rank === 1).length;
  const podiums = finished.filter((p) => p.rank <= 3).length;
  const exact = pools.reduce((n, p) => n + p.exact_podiums, 0);
  const full = pools.filter((p) => p.eligible_questions > 0 && p.answered_questions === p.eligible_questions).length;
  const seasons = new Set(pools.map((p) => p.season)).size;
  const items = [
    { icon: '🏆', title: 'Campeão de bolão', on: titles > 0, detail: titles ? `${titles}×` : 'vença um bolão finalizado' },
    { icon: '🥉', title: 'Pódio em bolão', on: podiums > 0, detail: podiums ? `${podiums}×` : 'termine no top 3' },
    { icon: '🎯', title: 'Pódio exato', on: exact > 0, detail: exact ? `${exact}×` : 'acerte P1, P2 e P3' },
    { icon: '✅', title: 'Presença completa', on: full > 0, detail: full ? `${full} bolão${full > 1 ? 'ões' : ''}` : 'responda todas as perguntas' },
    { icon: '📅', title: 'Veterano', on: seasons >= 2, detail: seasons >= 2 ? `${seasons} temporadas` : 'jogue em 2 temporadas' },
  ];
  return (
    <View style={{ marginBottom: 16 }}>
      <H2>Conquistas · {items.filter((i) => i.on).length}/{items.length}</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((i) => (
          <View key={i.title} accessible accessibilityLabel={`${i.title}: ${i.on ? 'conquistada' : 'bloqueada'}, ${i.detail}`}
            style={{ width: '31.8%', minHeight: 92, borderRadius: 14, padding: 10, gap: 4, backgroundColor: i.on ? '#2a2210' : colors.card, borderWidth: 1, borderColor: i.on ? '#6b5413' : colors.border, opacity: i.on ? 1 : 0.55 }}>
            <Text style={{ fontSize: 22 }}>{i.icon}</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800' }}>{i.title}</Text>
            <Text style={{ color: i.on ? colors.gold : colors.muted, fontSize: 11 }}>{i.detail}</Text>
          </View>
        ))}
      </View>
      <InsightDetails title="Sobre as conquistas"><Muted>São informativas: não dão pontos nem vantagem. Campeão e pódio só contam em bolões finalizados; empates compartilham posição. Consideram todos os seus bolões existentes.</Muted></InsightDetails>
    </View>
  );
}
