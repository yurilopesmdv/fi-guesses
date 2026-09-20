import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Podium } from '@/components/Podium';
import { KIND_LABEL, QuestionField } from '@/components/QuestionField';
import { addQuestion, deleteQuestion, fetchOfficialPodium, listQuestions, listResults, listStandings, saveResult } from '@/lib/repo';
import type { Answer, Question, QuestionKind, Standing } from '@/lib/types';
import { usePool } from '@/lib/usePool';
import { Button, Card, H2, Input, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const KINDS: QuestionKind[] = ['driver', 'position_of_driver', 'yesno', 'text'];
const PRESETS: { prompt: string; kind: QuestionKind; points: number }[] = [
  { prompt: 'Pole position', kind: 'driver', points: 2 },
  { prompt: 'Volta mais rápida', kind: 'driver', points: 2 },
  { prompt: 'Primeiro a abandonar', kind: 'driver', points: 2 },
  { prompt: 'Vai ter safety car?', kind: 'yesno', points: 1 },
];

export default function Admin() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const { pool, races, drivers, isOpen } = usePool();
  const race = races.find((r) => r.id === raceId);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [members, setMembers] = useState<Standing[]>([]);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<QuestionKind>('driver');
  const [points, setPoints] = useState('2');
  const [near, setNear] = useState('0');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!pool || !race) return;
    listQuestions(pool.id, race.id).then(async (qs) => {
      setQuestions(qs);
      const rs = await listResults(qs.map((q) => q.id));
      setResults(Object.fromEntries(rs.map((r) => [r.question_id, r.answer])));
    });
    listStandings(pool.id).then(setMembers);
  }, [pool, race]);
  useFocusEffect(load);

  if (!pool || !race || questions === null) return <Screen scroll={false}><Loading /></Screen>;
  const open = isOpen(race);
  const podiumQ = questions.find((q) => q.kind === 'podium')!;
  const extras = questions.filter((q) => q.kind !== 'podium');

  const create = async (p = prompt, k = kind, pts = parseInt(points, 10) || 1, np = parseInt(near, 10) || 0) => {
    if (!p.trim()) return;
    try {
      await addQuestion({ pool_id: pool.id, race_id: race.id, kind: k, prompt: p.trim(), points: pts, near_points: k === 'position_of_driver' ? np : 0, position: extras.length + 1 });
      setPrompt(''); load();
    } catch (e: any) { Alert.alert('Erro', e.message); }
  };

  const importPodium = async () => {
    setBusy(true);
    try {
      const r = await fetchOfficialPodium(race);
      if (!r) return Alert.alert('Ainda não publicado', 'A API ainda não tem o resultado desta corrida. Preencha à mão.');
      setResults((prev) => ({ ...prev, [podiumQ.id]: { p1: r.p1, p2: r.p2, p3: r.p3 } }));
      Alert.alert('Pódio importado', `${r.p1} · ${r.p2} · ${r.p3}\nConfira e toque em "Salvar apuração".`);
    } catch (e: any) { Alert.alert('Erro', e.message); } finally { setBusy(false); }
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      for (const q of questions) if (results[q.id]) await saveResult(q.id, results[q.id] as Answer);
      Alert.alert('Apuração salva', 'A pontuação já está no ranking.');
      router.back();
    } catch (e: any) { Alert.alert('Erro', e.message); } finally { setBusy(false); }
  };

  const setR = (qid: string, a: any) => setResults((prev) => ({ ...prev, [qid]: a }));
  const toggleCorrect = (qid: string, uid: string) => {
    const cur: string[] = results[qid]?.correct_users ?? [];
    setR(qid, { correct_users: cur.includes(uid) ? cur.filter((u) => u !== uid) : [...cur, uid] });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: `Apuração · ${race.name}` }} />

      <Card>
        <H2>Perguntas extras</H2>
        {extras.length === 0 && <Muted style={{ marginBottom: space(1) }}>Só o pódio por enquanto.</Muted>}
        {extras.map((q) => (
          <Row key={q.id} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flex: 1 }}><P>{q.prompt}</P><Muted>{KIND_LABEL[q.kind]} · {q.points} pts</Muted></View>
            <Pressable hitSlop={10} onPress={() => Alert.alert('Remover pergunta?', q.prompt, [{ text: 'Cancelar' }, { text: 'Remover', style: 'destructive', onPress: () => deleteQuestion(q.id).then(load) }])}>
              <Text style={{ color: colors.muted, fontSize: 18 }}>✕</Text>
            </Pressable>
          </Row>
        ))}
        <Muted style={{ marginTop: space(1) }}>Sugestões (1 toque):</Muted>
        <Row style={{ flexWrap: 'wrap', marginBottom: space(1) }}>
          {PRESETS.filter((p) => !extras.some((e) => e.prompt === p.prompt)).map((p) => (
            <Pressable key={p.prompt} onPress={() => create(p.prompt, p.kind, p.points)}><Pill>+ {p.prompt}</Pill></Pressable>
          ))}
        </Row>
        <Input placeholder='Pergunta (ex: "Em que lugar chega o Russell?")' value={prompt} onChangeText={setPrompt} />
        <Row style={{ flexWrap: 'wrap', marginBottom: space(1) }}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)}><Pill color={kind === k ? colors.red : colors.card2}>{KIND_LABEL[k]}</Pill></Pressable>
          ))}
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Muted>Pontos</Muted><Input value={points} onChangeText={setPoints} keyboardType="number-pad" /></View>
          {kind === 'position_of_driver' && <View style={{ flex: 1 }}><Muted>Pts se errar por 1</Muted><Input value={near} onChangeText={setNear} keyboardType="number-pad" /></View>}
        </Row>
        <Button title="Adicionar pergunta" variant="ghost" onPress={() => create()} />
      </Card>

      <Card style={{ borderColor: colors.red }}>
        <H2>Resultado oficial</H2>
        {open && <Muted style={{ marginBottom: space(1) }}>⚠️ Os palpites ainda estão abertos — normalmente você apura depois da corrida.</Muted>}
        <Button title="Importar pódio da API" variant="ghost" onPress={importPodium} loading={busy} style={{ marginTop: 0, marginBottom: space(1) }} />
        <Podium value={results[podiumQ.id] ?? {}} drivers={drivers} onChange={(v) => setR(podiumQ.id, v)} />
        {extras.map((q) => (
          <View key={q.id} style={{ marginTop: space(1.5) }}>
            <P style={{ fontWeight: '700', marginBottom: 6 }}>{q.prompt}</P>
            {q.kind === 'text' ? (
              <Row style={{ flexWrap: 'wrap' }}>
                {members.map((m) => {
                  const ok = (results[q.id]?.correct_users ?? []).includes(m.user_id);
                  return <Pressable key={m.user_id} onPress={() => toggleCorrect(q.id, m.user_id)}><Pill color={ok ? colors.green : colors.card2}>{m.avatar} {m.name} {ok ? '✓' : ''}</Pill></Pressable>;
                })}
                <Muted>Marque quem acertou.</Muted>
              </Row>
            ) : (
              <QuestionField q={q} value={results[q.id]} drivers={drivers} onChange={(a) => setR(q.id, a)} />
            )}
          </View>
        ))}
        <Button title="Salvar apuração" onPress={saveAll} loading={busy} />
      </Card>
    </Screen>
  );
}
