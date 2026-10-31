import { InsightDetails } from '@/components/insights/InsightUI';
import { RacePreparation } from '@/components/insights/RacePreparation';
import { answerLabel } from './QuestionField';
import { RaceTools } from '@/components/insights/RaceTools';
import { usePredictionOutbox } from '@/lib/predictionOutbox';
import { CircuitLink } from '@/components/circuits/CircuitLink';
import { CircuitInsight } from '@/components/circuits/CircuitInsight';
import { RaceStory } from '@/components/RaceStory';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { PicksBoard } from './PicksBoard';
import { Podium } from './Podium';
import { Schedule } from './Schedule';
import { StartingGrid } from './StartingGrid';
import { RaceClassification } from './RaceClassification';
import { PoolStatus } from './PoolStatus';
import { WeekendHeader } from './WeekendHeader';
import { poolStatusDescription } from '@/lib/poolStatus';
import { QuestionField } from './QuestionField';
import { useUserId } from '@/lib/auth';
import { flag, fmtCountdown, fmtDate, lockTime, questionDeadline, sessionLabel } from '@/lib/format';
import { listPredictions, listQuestions, listRaceResults, listResults, listStandings, listSupportRaces, raceParticipation } from '@/lib/repo';
import type { Answer, Prediction, Question, Race, RaceResult, Result, Standing, StartingGrid as Grid } from '@/lib/types';
import { usePool } from '@/lib/usePool';
import { Button, Card, H2, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

/** Palpite: o que fazer agora. GP: entender e analisar o fim de semana. Mesmos dados, responsabilidades separadas. */
export function RaceView({ race, mode = 'palpite' }: { race: Race; mode?: 'palpite' | 'gp' }) {
  const { pool, drivers, lifecycle } = usePool();
  const uid = useUserId();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [members, setMembers] = useState<Standing[]>([]);
  const [participation, setParticipation] = useState<Record<string, boolean>>({});
  const [official, setOfficial] = useState<RaceResult[]>([]);
  const [startingGrid, setStartingGrid] = useState<Grid | null>(null);
  const [support, setSupport] = useState<Race[]>([]);
  const [now, setNow] = useState(Date.now());
  const outbox=usePredictionOutbox();
  const questionIds=questions?.map(q=>q.id)??[];
  const drafts=outbox.rows.filter(r=>questionIds.includes(r.questionId));
  // Envio normal leva ~1 s: só avisa quando falhou, venceu ou ficou preso (sem conexão).
  const stuck=drafts.filter(d=>d.status!=='pending'||now-Number(d.version.split('-')[0])>8000);

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

  // Palpite confirmado só altera "quem já palpitou": atualiza localmente, sem recarregar a tela.
  const acceptedHere=questions?.some(q=>Object.hasOwn(outbox.acceptedAnswers,q.id))??false;
  useEffect(()=>{if(acceptedHere&&uid)setParticipation(p=>p[uid]?p:{...p,[uid]:true});},[acceptedHere,uid]);

  const onAnswer = (q: Question, answer: Answer) => {
    void outbox.enqueue(q.id,answer,new Date(questionDeadline(q,race,pool?.lock_minutes_before??0)??lockAt).toISOString()).catch(e=>Alert.alert('Rascunho pendente',e.message));
  };

  if (!pool || questions === null) return <Screen scroll={false}><Loading /></Screen>;
  /** Status de altura fixa: nunca empurra o resto da tela. */
  const saveState = (id: string) => {
    const d = outbox.get(id), ok = !d && (outbox.confirmed.includes(id) || predictions.some((p) => p.question_id === id && p.user_id === uid));
    const label = d ? (d.status === 'pending' ? 'Salvando…' : d.status === 'expired' ? 'Prazo encerrado' : 'Não enviado') : ok ? '✓ Salvo' : ' ';
    return <Text style={{ height: 18, marginTop: 6, fontSize: 12, color: !d ? colors.green : d.status === 'pending' ? colors.muted : colors.gold }}>{label}</Text>;
  };

  const confirmedPredictions=[...predictions.filter(p=>!(p.user_id===uid&&outbox.acceptedAnswers[p.question_id])),...Object.entries(outbox.acceptedAnswers).filter(([id])=>questionIds.includes(id)).map(([id,answer])=>({id:'accepted-'+id,question_id:id,user_id:uid,answer}))];

  const mine = (qid: string):any => outbox.get(qid)?.answer ?? outbox.acceptedAnswers[qid] ?? predictions.find((p) => p.question_id === qid && p.user_id === uid)?.answer as any;
  const podiumQ = questions.find((q) => q.kind === 'podium');
  const extras = questions.filter((q) => q.kind !== 'podium');
  const hasResults = results.length > 0;

  const finished = official.some((r) => r.session === 'race');
  if (mode === 'gp') return (
    <Screen>
      <WeekendHeader race={race} />
      <Schedule race={race} support={support} />
      <RacePreparation race={race} questions={questions} minutes={pool.lock_minutes_before} grid={startingGrid}/>
      <StartingGrid race={race} drivers={drivers} results={official} onGridChange={setStartingGrid} />
      <RaceClassification race={race} drivers={drivers} results={official} />
      <RaceStory race={race} drivers={drivers} results={official} />
      <RaceTools poolId={pool.id} race={race} questions={questions} predictions={confirmedPredictions} results={results} members={members} drivers={drivers} uid={uid} grid={startingGrid} official={official}/>
      <CircuitInsight race={race} />
    </Screen>
  );

  return (
    <Screen>
      <WeekendHeader race={race} lockAt={hasResults ? undefined : lockAt}
        status={<Row style={{ flexWrap: 'wrap' }}><PoolStatus state={lifecycle} /><Muted>{poolStatusDescription(lifecycle)}</Muted>{!open && hasResults ? <Pill color={colors.red}>apurada</Pill> : null}</Row>}>
        {open && <Muted style={{color:drafts.length?colors.gold:outbox.confirmed.some(id=>questionIds.includes(id))?colors.green:colors.muted}}>{drafts.length?'Enviando seu palpite…':outbox.confirmed.some(id=>questionIds.includes(id))?'Palpite confirmado pelo servidor ✓':'Altere seu palpite até o fechamento'}</Muted>}
      </WeekendHeader>

      {isOwner && (
        <Pressable onPress={() => router.push(`/pool/${pool.id}/admin/${race.id}`)}>
          <Card style={{ borderColor: colors.red, backgroundColor: '#1f1216' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <P style={{ fontWeight: '800' }}>⚙️ Apuração · organizador</P>
                <Muted>{open ? 'Perguntas e resultados' : hasResults ? 'Revisar resultados' : 'Informar resultados'}</Muted>
              </View>
              <Text style={{ color: colors.red, fontSize: 24 }}>›</Text>
            </Row>
          </Card>
        </Pressable>
      )}

      {/* Contexto do momento: resultado após a corrida; grid/qualy (top 10) depois da classificação; nada antes. */}
      {finished ? <RaceClassification race={race} drivers={drivers} results={official} limit={10} />
        : <StartingGrid race={race} drivers={drivers} results={official} compact onGridChange={setStartingGrid} />}

      {open ? (
        <>
          {podiumQ && (
            <Card>
              <H2>🏆 Seu palpite de pódio</H2><Muted style={{fontSize:12,marginBottom:8}}>3 pts na posição · 1 pt no pódio</Muted>
              <Podium value={mine(podiumQ.id) ?? {}} startingGrid={startingGrid} drivers={drivers} race={race} onChange={(v) => onAnswer(podiumQ, v)} />
              {saveState(podiumQ.id)}
            </Card>
          )}
          {extras.length > 0 && <H2 style={{ marginTop: space(0.5) }}>❓ Perguntas extras</H2>}
          {extras.map((q) => (
            <Card key={q.id}>
              <H2>{q.prompt} <Muted>{q.points} pts{q.near_points ? ` · ±1: ${q.near_points}` : ''}</Muted></H2>
              <Muted>{sessionLabel(q.session)}</Muted>
              {(questionDeadline(q,race,pool.lock_minutes_before)??0)>now?<><QuestionField q={q} value={mine(q.id)} race={race} startingGrid={startingGrid} drivers={drivers} onChange={(a) => onAnswer(q, a)} />{saveState(q.id)}</>:<P>Palpites encerrados · Sua resposta confirmada: {answerLabel(q,outbox.acceptedAnswers[q.id]??predictions.find(p=>p.question_id===q.id&&p.user_id===uid)?.answer,drivers)}</P>}
            </Card>
          ))}
          {(stuck.length>0||outbox.error)&&<Card style={{borderColor:colors.gold}}><H2>Envio dos palpites</H2>{outbox.error&&<Muted>{outbox.error}</Muted>}{stuck.map(d=><Muted key={d.questionId}>{questions.find(q=>q.id===d.questionId)?.prompt}: {d.error??'Guardado neste aparelho. Aguardando conexão para enviar.'}</Muted>)}{stuck.some(d=>d.status!=='expired')&&<Button title="Tentar enviar agora" variant="ghost" onPress={()=>void outbox.retry(questionIds).catch(e=>Alert.alert('Envio pendente',e.message))}/>}{stuck.some(d=>d.status==='expired')&&<Button title="Descartar rascunhos vencidos" variant="ghost" onPress={()=>void outbox.discardExpired(questionIds).catch(()=>Alert.alert('Armazenamento indisponível','Não foi possível atualizar os rascunhos neste aparelho.'))}/>}</Card>}
          <Card>
            <H2>Quem já palpitou</H2>
            <Row style={{ flexWrap: 'wrap' }}>
              {members.map((m) => (
                <Pill key={m.user_id} color={participation[m.user_id] ? colors.card2 : '#3a2a10'}>
                  {m.avatar} {m.name} {(participation[m.user_id] || (m.user_id===uid&&podiumQ&&outbox.confirmed.includes(podiumQ.id))) ? '✓' : '⏳'}
                </Pill>
              ))}
            </Row>
          </Card>
          <PicksBoard questions={questions} predictions={confirmedPredictions} results={results} members={members} drivers={drivers} uid={uid} />
        </>
      ) : (
        <PicksBoard questions={questions} predictions={confirmedPredictions} results={results} members={members} drivers={drivers} uid={uid} />
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir detalhes do GP" onPress={() => router.push(`/pool/${pool.id}/gp?raceId=${race.id}`)}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 22 }}>📊</Text>
          <View style={{ flex: 1 }}><P style={{ fontWeight: '800' }}>Detalhes do GP</P><Muted style={{ fontSize: 12 }}>Grid completo, programação F2/F3, raio-X da pista, volta a volta e ferramentas</Muted></View>
          <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>
        </Card>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  tr: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, gap: space(1), alignItems: 'flex-start' },
  th: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  td: { color: colors.text, fontSize: 13 },
});
