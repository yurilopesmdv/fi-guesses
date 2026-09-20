import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { answerLabel } from './QuestionField';
import { openDriver } from '@/lib/nav';
import type { Driver, Prediction, Question, Result, Standing } from '@/lib/types';
import { Card, H2, Muted, Row } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

type Props = { questions: Question[]; predictions: Prediction[]; results: Result[]; members: Standing[]; drivers: Driver[]; uid: string };

const SLOT = [{ k: 'p1', l: '1º', c: colors.gold }, { k: 'p2', l: '2º', c: colors.silver }, { k: 'p3', l: '3º', c: colors.bronze }] as const;

/** Pontos de uma resposta (mesma regra do SQL) — só quando há resultado. */
function points(q: Question, a: any, r: any, uid: string): number | null {
  if (!r || !a) return null;
  if (q.kind === 'podium') {
    const pod = [r.p1, r.p2, r.p3];
    return (['p1', 'p2', 'p3'] as const).reduce((t, k) => t + (a[k] === r[k] ? 3 : a[k] && pod.includes(a[k]) ? 1 : 0), 0);
  }
  if (q.kind === 'driver') return a.driver === r.driver ? q.points : 0;
  if (q.kind === 'yesno') return a.v === r.v ? q.points : 0;
  if (q.kind === 'position_of_driver') return a.pos === r.pos ? q.points : Math.abs(a.pos - r.pos) === 1 ? q.near_points : 0;
  return (r.correct_users ?? []).includes(uid) ? q.points : 0;
}

/** Quadro de palpites de todo mundo: Cards (comparação com o seu) ou Tabela (todos de uma vez). */
export function PicksBoard({ questions, predictions, results, members, drivers, uid }: Props) {
  const [mode, setMode] = useState<'cards' | 'table'>('cards');
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));
  const ans = (qid: string, u: string) => predictions.find((p) => p.question_id === qid && p.user_id === u)?.answer as any;
  const res = (qid: string) => results.find((r) => r.question_id === qid)?.answer as any;
  const podiumQ = questions.find((q) => q.kind === 'podium');
  const extras = questions.filter((q) => q.kind !== 'podium');
  const ordered = [...members].sort((a, b) => (a.user_id === uid ? -1 : b.user_id === uid ? 1 : 0));
  const mine = podiumQ ? ans(podiumQ.id, uid) ?? {} : {};
  const hasResults = results.length > 0;

  // consenso por coluna
  const consensus = (get: (u: string) => string | undefined) => {
    const cnt = new Map<string, number>();
    for (const m of members) { const v = get(m.user_id); if (v) cnt.set(v, (cnt.get(v) ?? 0) + 1); }
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { v: top[0], n: top[1] } : null;
  };
  const totalOf = (u: string) => questions.reduce((t, q) => t + (points(q, ans(q.id, u), res(q.id), u) ?? 0), 0);
  const short = (code?: string) => (code ? byCode[code]?.name.split(' ').pop() ?? code : '—');

  const Chip = ({ code, hit, dim }: { code?: string; hit?: boolean; dim?: boolean }) => (
    <Pressable onPress={() => openDriver(code ? byCode[code] : null)} style={[s.chip, hit && { backgroundColor: '#14532d' }, dim && { opacity: 0.5 }]}>
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: code ? byCode[code]?.team_color ?? colors.muted : colors.border }} />
      <Text style={s.chipTxt}>{code ?? '—'}</Text>
    </Pressable>
  );

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: space(1) }}>
        <H2 style={{ marginBottom: 0 }}>👀 Palpites da galera</H2>
        <Row style={{ gap: 4 }}>
          {(['cards', 'table'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[s.tab, mode === m && { backgroundColor: colors.red }]}>
              <Text style={s.tabTxt}>{m === 'cards' ? 'Cards' : 'Tabela'}</Text>
            </Pressable>
          ))}
        </Row>
      </Row>

      {podiumQ && (() => {
        const cons = SLOT.map((sl) => consensus((u) => ans(podiumQ.id, u)?.[sl.k]));
        return (
          <Row style={{ marginBottom: space(1), flexWrap: 'wrap' }}>
            <Muted>Mais votados:</Muted>
            {SLOT.map((sl, i) => cons[i] && (
              <Text key={sl.k} style={{ color: sl.c, fontWeight: '700', fontSize: 13 }}>{sl.l} {cons[i]!.v} ({cons[i]!.n}/{members.length})</Text>
            ))}
          </Row>
        );
      })()}

      {mode === 'cards' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(1) }}>
          {ordered.map((m) => {
            const me = m.user_id === uid;
            const pod = podiumQ ? ans(podiumQ.id, m.user_id) : null;
            return (
              <View key={m.user_id} style={[s.card, me && { borderColor: colors.red }]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={s.name} numberOfLines={1}>{m.avatar} {me ? 'Você' : m.name}</Text>
                  {hasResults && <Text style={{ color: colors.gold, fontWeight: '900' }}>{totalOf(m.user_id)} pts</Text>}
                </Row>
                {podiumQ && SLOT.map((sl) => {
                  const code = pod?.[sl.k];
                  const r = res(podiumQ.id);
                  const hit = r ? code && code === r[sl.k] : !me && code && code === mine[sl.k];
                  return (
                    <Pressable key={sl.k} onPress={() => openDriver(code ? byCode[code] : null)}>
                    <Row style={{ marginTop: 6 }}>
                      <Text style={{ color: sl.c, fontWeight: '900', width: 22 }}>{sl.l}</Text>
                      <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: code ? byCode[code]?.team_color ?? colors.muted : colors.border }} />
                      <Text style={[s.pick, hit && { color: colors.green }]} numberOfLines={1}>{short(code)}{hit ? ' ✓' : ''}</Text>
                    </Row>
                    </Pressable>
                  );
                })}
                {!pod && <Muted style={{ marginTop: 6 }}>ainda não palpitou</Muted>}
                {extras.map((q) => {
                  const a = ans(q.id, m.user_id);
                  const pts = points(q, a, res(q.id), m.user_id);
                  return (
                    <View key={q.id} style={{ marginTop: 6 }}>
                      <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{q.prompt}</Text>
                      <Text style={[s.pick, pts != null && pts > 0 && { color: colors.green }]} numberOfLines={1}>{answerLabel(q, a, drivers)}{pts != null ? ` (+${pts})` : ''}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <Row style={s.tr}>
              <Text style={[s.th, { width: 96 }]}>Quem</Text>
              {podiumQ && SLOT.map((sl) => <Text key={sl.k} style={[s.th, { width: 60, color: sl.c }]}>{sl.l}</Text>)}
              {extras.map((q) => <Text key={q.id} style={[s.th, { width: 96 }]} numberOfLines={2}>{q.prompt}</Text>)}
              {hasResults && <Text style={[s.th, { width: 44 }]}>Pts</Text>}
            </Row>
            {ordered.map((m) => {
              const me = m.user_id === uid;
              const pod = podiumQ ? ans(podiumQ.id, m.user_id) : null;
              return (
                <Row key={m.user_id} style={[s.tr, me && { backgroundColor: '#1f1216' }]}>
                  <Text style={[s.td, { width: 96, fontWeight: '800' }]} numberOfLines={1}>{m.avatar} {me ? 'Você' : m.name}</Text>
                  {podiumQ && SLOT.map((sl) => {
                    const code = pod?.[sl.k]; const r = res(podiumQ.id);
                    const hit = r ? code && code === r[sl.k] : !me && code && code === mine[sl.k];
                    return <View key={sl.k} style={{ width: 60 }}><Chip code={code} hit={!!hit} /></View>;
                  })}
                  {extras.map((q) => {
                    const a = ans(q.id, m.user_id); const pts = points(q, a, res(q.id), m.user_id);
                    const same = !me && a && JSON.stringify(a) === JSON.stringify(ans(q.id, uid));
                    return <Text key={q.id} style={[s.td, { width: 96 }, (pts != null ? pts > 0 : same) && { color: colors.green }]} numberOfLines={2}>{answerLabel(q, a, drivers)}{pts != null ? ` (+${pts})` : ''}</Text>;
                  })}
                  {hasResults && <Text style={[s.td, { width: 44, fontWeight: '900', color: colors.gold }]}>{totalOf(m.user_id)}</Text>}
                </Row>
              );
            })}
          </View>
        </ScrollView>
      )}
      <Muted style={{ marginTop: space(1), fontSize: 12 }}>{hasResults ? 'Verde = acertou.' : 'Verde = igual ao seu palpite.'}</Muted>
    </Card>
  );
}

const s = StyleSheet.create({
  tab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.card2 },
  tabTxt: { color: colors.text, fontWeight: '700', fontSize: 12 },
  card: { width: 170, backgroundColor: colors.card2, borderRadius: radius, padding: space(1.5), borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: '800', flex: 1 },
  pick: { color: colors.text, fontWeight: '600', fontSize: 14, flex: 1 },
  tr: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, gap: space(1), alignItems: 'center', borderRadius: 6, paddingHorizontal: 4 },
  th: { color: colors.muted, fontWeight: '700', fontSize: 11 },
  td: { color: colors.text, fontSize: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, alignSelf: 'flex-start' },
  chipTxt: { color: colors.text, fontWeight: '800', fontSize: 12 },
});
