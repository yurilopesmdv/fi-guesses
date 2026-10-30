import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { InsightDetails } from '@/components/insights/InsightUI';
import { racePoints, scoreQuestion, slots, type PoolAnalysis } from '@/lib/poolInsights';
import type { Standing } from '@/lib/types';
import { Card, H2, Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Comparação entre dois membros do mesmo bolão (P10), só em perguntas apuradas que ambos responderam. */
export function PersonCompare({ data, members, userId }: { data: PoolAnalysis; members: Standing[]; userId: string }) {
  const others = members.filter((m) => m.user_id !== userId);
  const [other, setOther] = useState<string | null>(others[0]?.user_id ?? null);
  if (!others.length || !other) return null;
  const me = members.find((m) => m.user_id === userId)!, them = members.find((m) => m.user_id === other)!;
  const answer = (qid: string, uid: string) => data.predictions.find((p) => p.question_id === qid && p.user_id === uid)?.answer;
  const settled = data.questions.filter((q) => data.results.some((r) => r.question_id === q.id));
  const common = settled.filter((q) => answer(q.id, userId) && answer(q.id, other));
  const pts = (uid: string) => common.reduce((n, q) => n + scoreQuestion(q, answer(q.id, uid), data.results.find((r) => r.question_id === q.id)?.answer, uid), 0);
  const exact = (uid: string) => common.filter((q) => { const a = answer(q.id, uid) as any, r = data.results.find((x) => x.question_id === q.id)?.answer as any; return q.kind === 'podium' && slots.every((s) => a?.[s] && a[s] === r?.[s]); }).length;
  const races = data.races.filter((r) => common.some((q) => q.race_id === r.id));
  let wa = 0, wb = 0;
  for (const r of races) { const a = racePoints(data, r.id, userId), b = racePoints(data, r.id, other); if (a > b) wa++; else if (b > a) wb++; }
  const lines: [string, number, number][] = [['Pontos nas perguntas em comum', pts(userId), pts(other)], ['Etapas com mais pontos', wa, wb], ['Pódios exatos', exact(userId), exact(other)]];
  return (
    <Card>
      <H2>Comparar com</H2>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
        {others.map((m) => (
          <Pressable key={m.user_id} accessibilityRole="button" accessibilityState={{ selected: m.user_id === other }} onPress={() => setOther(m.user_id)}
            style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, justifyContent: 'center', backgroundColor: m.user_id === other ? colors.red : colors.card2 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{m.avatar} {m.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Row style={{ marginBottom: 4 }}>
        <Text style={{ flex: 1, color: colors.gold, fontWeight: '800' }} numberOfLines={1}>{me.avatar} {me.name}</Text>
        <Text style={{ flex: 1, color: '#7DB7FF', fontWeight: '800', textAlign: 'right' }} numberOfLines={1}>{them.name} {them.avatar}</Text>
      </Row>
      {lines.map(([label, a, b]) => (
        <View key={label} style={{ minHeight: 44, justifyContent: 'center', gap: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Row>
            <Text style={{ width: 40, color: a > b ? colors.gold : colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{a}</Text>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12 }}>{label}</Text>
            <Text style={{ width: 40, textAlign: 'right', color: b > a ? '#7DB7FF' : colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{b}</Text>
          </Row>
          <View style={{ flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.card2 }}>
            {a + b > 0 && <><View style={{ flex: a, backgroundColor: colors.gold }} /><View style={{ flex: b, backgroundColor: '#3B82F6' }} /></>}
          </View>
        </View>
      ))}
      <Muted style={{ fontSize: 12, marginTop: 8 }}>Amostra: {common.length} perguntas apuradas respondidas por ambos em {races.length} etapas.</Muted>
      <InsightDetails title="Como comparamos"><Muted>Só perguntas deste bolão, já apuradas e respondidas pelos dois, para o mesmo denominador. Empate numa etapa não conta para ninguém.</Muted></InsightDetails>
    </Card>
  );
}
