import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PicksBoard } from './PicksBoard';
import { Podium } from './Podium';
import { Schedule } from './Schedule';
import { QuestionField, answerLabel } from './QuestionField';
import { useUserId } from '@/lib/auth';
import { openDriver } from '@/lib/nav';
import { flag, fmtCountdown, fmtDate, lockTime } from '@/lib/format';
import { listPredictions, listQuestions, listRaceResults, listResults, listStandings, listSupportRaces, raceParticipation, savePrediction } from '@/lib/repo';
import type { Answer, Prediction, Question, Race, RaceResult, Result, Standing } from '@/lib/types';
import { usePool } from '@/lib/usePool';
import { Button, Card, H2, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

export function RaceView({ race }: { race: Race }) {
  const { pool, drivers } = usePool();
  const uid = useUserId();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [members, setMembers] = useState<Standing[]>([]);
  const [participation, setParticipation] = useState<Record<string, boolean>>({});
  const [official, setOfficial] = useState<RaceResult[]>([]);
  const [support, setSupport] = useState<Race[]>([]);
  const [now, setNow] = useState(Date.now());
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok'>('idle');

  const lockAt = lockTime(race.date_utc, pool?.lock_minutes_before ?? 0);
  const open = now < lockAt;
  const isOwner = pool?.owner_id === uid;

  const load = useCallback(() => {
    if (!pool) return;
    (async () => {
      const qs = await listQuestions(pool.id, race.id);
      const ids = qs.map((q) => q.id);
      const [ps, rs, ms, part, off, sup] = await Promise.all([
        listPredictions(ids), listResults(ids), listStandings(pool.id), raceParticipation(pool.id, race.id), listRaceResults(race.season, race.round), listSupportRaces(race),
      ]);
      setQuestions(qs); setPredictions(ps); setResults(rs); setMembers(ms); setOfficial(off); setSupport(sup);
      setParticipation(Object.fromEntries(part.map((p) => [p.user_id, p.has_prediction])));
    })().catch((e) => Alert.alert('Erro', e.message));
  }, [pool, race.id]);
  useFocusEffect(load);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  // auto-save com debounce curto por pergunta
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onAnswer = (q: Question, answer: Answer) => {
    setPredictions((prev) => {
      const i = prev.findIndex((p) => p.question_id === q.id && p.user_id === uid);
      const next = [...prev];
      if (i >= 0) next[i] = { ...next[i], answer }; else next.push({ id: '', question_id: q.id, user_id: uid, answer });
      return next;
    });
    setSaved('saving');
    clearTimeout(timers.current[q.id]);
    timers.current[q.id] = setTimeout(async () => {
      try { await savePrediction(q.id, answer); setSaved('ok'); setParticipation((p) => ({ ...p, [uid]: true })); }
      catch (e: any) { setSaved('idle'); Alert.alert('Não salvou', e.message); }
    }, 600);
  };

  if (!pool || questions === null) return <Screen scroll={false}><Loading /></Screen>;

  const mine = (qid: string) => predictions.find((p) => p.question_id === qid && p.user_id === uid)?.answer as any;
  const podiumQ = questions.find((q) => q.kind === 'podium');
  const extras = questions.filter((q) => q.kind !== 'podium');
  const hasResults = results.length > 0;

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{flag(race.country)} {race.name}</Text>
            <Muted>{race.circuit} · Largada {fmtDate(race.date_utc)}</Muted>
          </View>
          {open ? <Pill color={colors.green}>fecha em {fmtCountdown(lockAt - now)}</Pill>
            : hasResults ? <Pill color={colors.red}>apurada</Pill> : <Pill>fechada</Pill>}
        </Row>
        {open && <Muted style={{ marginTop: 6 }}>{saved === 'saving' ? 'Salvando…' : saved === 'ok' ? 'Palpite salvo ✓ · ' : ''}Você pode alterar seus palpites até a largada.</Muted>}
      </Card>

      {isOwner && (
        <Pressable onPress={() => router.push(`/pool/${pool.id}/admin/${race.id}`)}>
          <Card style={{ borderColor: colors.red, backgroundColor: '#1f1216' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <P style={{ fontWeight: '800' }}>⚙️ Você é o organizador</P>
                <Muted>{open ? `${extras.length} pergunta${extras.length === 1 ? '' : 's'} extra${extras.length === 1 ? '' : 's'} · toque pra adicionar` : hasResults ? 'Apuração feita · toque pra editar' : 'Corrida fechada · toque pra apurar'}</Muted>
              </View>
              <Text style={{ color: colors.red, fontSize: 24 }}>›</Text>
            </Row>
          </Card>
        </Pressable>
      )}

      {open ? (
        <>
          <Schedule race={race} support={support} />
          {podiumQ && (
            <Card>
              <H2>🏆 Pódio <Muted>3 pts exato · 1 pt piloto certo</Muted></H2>
              <Podium value={mine(podiumQ.id) ?? {}} drivers={drivers} onChange={(v) => onAnswer(podiumQ, v)} />
            </Card>
          )}
          {extras.length > 0 && <H2 style={{ marginTop: space(0.5) }}>❓ Perguntas extras</H2>}
          {extras.map((q) => (
            <Card key={q.id}>
              <H2>{q.prompt} <Muted>{q.points} pts{q.near_points ? ` · ±1: ${q.near_points}` : ''}</Muted></H2>
              <QuestionField q={q} value={mine(q.id)} drivers={drivers} onChange={(a) => onAnswer(q, a)} />
            </Card>
          ))}
          <PicksBoard questions={questions} predictions={predictions} results={results} members={members} drivers={drivers} uid={uid} />
          <Card>
            <H2>Quem já palpitou</H2>
            <Row style={{ flexWrap: 'wrap' }}>
              {members.map((m) => (
                <Pill key={m.user_id} color={participation[m.user_id] ? colors.card2 : '#3a2a10'}>
                  {m.avatar} {m.name} {participation[m.user_id] ? '✓' : '⏳'}
                </Pill>
              ))}
            </Row>
          </Card>
        </>
      ) : (
        <>
          <PicksBoard questions={questions} predictions={predictions} results={results} members={members} drivers={drivers} uid={uid} />
          {official.length > 0 && (
            <Card>
              <H2>🏁 Classificação da corrida</H2>
              {official.slice(0, 10).map((r) => {
                const d = drivers.find((x) => x.code === r.driver_code);
                return (
                  <Pressable key={r.position} onPress={() => openDriver(d)}>
                  <Row style={{ marginBottom: 6 }}>
                    <Text style={{ color: colors.muted, fontWeight: '800', width: 28 }}>{r.position}</Text>
                    <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: d?.team_color ?? colors.border }} />
                    <P style={{ flex: 1, fontWeight: '600' }}>{d?.name ?? r.driver_code}{r.fastest_lap ? ' ⏱️' : ''}</P>
                    <Muted>{r.status !== 'Finished' && !/^\+\d/.test(r.status) ? r.status : `${r.points} pts`}</Muted>
                  </Row>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </>
      )}

    </Screen>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  tr: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, gap: space(1), alignItems: 'flex-start' },
  th: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  td: { color: colors.text, fontSize: 13 },
});
