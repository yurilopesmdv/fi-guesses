import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { circuitCountry, circuitDirection, circuitLength } from '@/lib/circuits';
import { flag } from '@/lib/format';
import { getCircuitProfile, getCircuitWinnersOverlap, listCircuitNames, type CircuitOverlap } from '@/lib/repo';
import type { CircuitProfile } from '@/lib/types';
import { Button, Card, H2, Input, Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

type Pick = { id: string; name: string; country: string; locality: string };
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Line({ label, a, b, na, nb }: { label: string; a: string; b: string; na?: number | null; nb?: number | null }) {
  const win = na != null && nb != null && na !== nb ? (na > nb ? 'a' : 'b') : null;
  return (
    <Row style={{ minHeight: 36, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Text style={{ flex: 1, color: win === 'a' ? colors.gold : colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{a}</Text>
      <Text style={{ flex: 1.2, color: colors.muted, fontSize: 12, textAlign: 'center' }}>{label}</Text>
      <Text style={{ flex: 1, color: win === 'b' ? colors.gold : colors.text, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{b}</Text>
    </Row>
  );
}

/** Compara duas pistas: ficha técnica de referência, histórico no Mundial e vencedores em comum. */
export function CircuitCompare({ a }: { a: CircuitProfile }) {
  const [list, setList] = useState<Pick[] | null>(null);
  const [query, setQuery] = useState('');
  const [b, setB] = useState<CircuitProfile | null>(null);
  const [overlap, setOverlap] = useState<CircuitOverlap | null>(null);
  const [error, setError] = useState('');
  const open = () => { setError(''); if (!list) listCircuitNames().then(setList).catch(() => setError('Não foi possível carregar as pistas.')); else setList(list); setB(null); setQuery(''); };
  const choose = async (id: string) => {
    setError('');
    try { const [p, o] = await Promise.all([getCircuitProfile(id), getCircuitWinnersOverlap(a.circuit.id, id)]); setB(p); setOverlap(o); }
    catch { setError('Não foi possível comparar agora.'); }
  };
  const matches = (list ?? []).filter((c) => c.id !== a.circuit.id && (!query || norm(`${c.name} ${c.locality} ${circuitCountry(c.country)}`).includes(norm(query)))).slice(0, 6);
  return (
    <Card>
      <H2>⚔️ Comparar pista</H2>
      {!b && !list && <><Muted>Ficha lado a lado e pilotos que venceram nas duas.</Muted><Button title="Escolher outra pista" onPress={open} /></>}
      {!b && list && <>
        <Input value={query} onChangeText={setQuery} placeholder="Buscar pista, cidade ou país" autoCorrect={false} />
        {matches.map((c) => (
          <Pressable key={c.id} accessibilityRole="button" onPress={() => void choose(c.id)} style={{ minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{flag(c.country)} {c.name}</Text>
            <Muted style={{ fontSize: 12 }}>{c.locality} · {circuitCountry(c.country)}</Muted>
          </Pressable>
        ))}
      </>}
      {error ? <Muted style={{ color: colors.gold }}>{error}</Muted> : null}
      {b && <>
        <Row style={{ marginBottom: 6 }}>
          <Text style={{ flex: 1, color: colors.text, fontWeight: '800' }} numberOfLines={2}>{flag(a.circuit.country)} {a.circuit.name}</Text>
          <Text style={{ flex: 1, color: colors.text, fontWeight: '800', textAlign: 'right' }} numberOfLines={2}>{b.circuit.name} {flag(b.circuit.country)}</Text>
        </Row>
        <Line label="Extensão" a={a.layout ? circuitLength(a.layout.length_m) : '—'} b={b.layout ? circuitLength(b.layout.length_m) : '—'} na={a.layout?.length_m} nb={b.layout?.length_m} />
        <Line label="Curvas" a={String(a.layout?.turns ?? '—')} b={String(b.layout?.turns ?? '—')} na={a.layout?.turns} nb={b.layout?.turns} />
        <Line label="Sentido" a={a.layout ? circuitDirection(a.layout.direction) : '—'} b={b.layout ? circuitDirection(b.layout.direction) : '—'} />
        <Line label="GPs no Mundial" a={String(a.stats.races)} b={String(b.stats.races)} na={a.stats.races} nb={b.stats.races} />
        <Line label="Estreia" a={String(a.stats.first_season ?? '—')} b={String(b.stats.first_season ?? '—')} />
        <Line label="Vencedores diferentes" a={String(a.stats.different_winners)} b={String(b.stats.different_winners)} na={a.stats.different_winners} nb={b.stats.different_winners} />
        {overlap && <>
          <Muted style={{ fontSize: 12, marginTop: 14, marginBottom: 6 }}>VENCERAM NAS DUAS · {overlap.common.length}</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {overlap.common.map((c) => (
              <Pressable key={c.driver_id} accessibilityRole="button" accessibilityLabel={`${c.name}: ${c.a} e ${c.b} vitórias`} onPress={() => router.push(`/driver/${c.driver_id}`)}
                style={{ minHeight: 34, paddingHorizontal: 10, borderRadius: 17, justifyContent: 'center', backgroundColor: colors.card2 }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{c.name.split(' ').pop()} <Text style={{ color: colors.gold }}>{c.a}·{c.b}</Text></Text>
              </Pressable>
            ))}
            {!overlap.common.length && <Muted>Nenhum piloto venceu nas duas.</Muted>}
          </View>
          <Muted style={{ fontSize: 12, marginTop: 8 }}>Só aqui: {overlap.only_a} vencedores · só na outra: {overlap.only_b}. Ficha técnica pelo traçado de referência mais recente.</Muted>
        </>}
        <Button title="Comparar com outra" variant="ghost" onPress={open} />
      </>}
    </Card>
  );
}
