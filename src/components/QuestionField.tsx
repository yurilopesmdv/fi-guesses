import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DriverPicker } from './DriverPicker';
import { PositionPicker } from './PositionPicker';
import type { Answer, Driver, Question } from '@/lib/types';
import { Input, Row } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

type Props = { q: Question; value: any; drivers: Driver[]; onChange: (a: Answer) => void };

/** Entrada de resposta pra perguntas personalizadas (também usada pelo organizador na apuração). */
export function QuestionField({ q, value, drivers, onChange }: Props) {
  const [picking, setPicking] = useState(false);
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));

  if (q.kind === 'driver') {
    const d = value?.driver ? byCode[value.driver] : null;
    return (
      <>
        <Pressable onPress={() => setPicking(true)} style={s.box}>
          <View style={[s.stripe, { backgroundColor: d?.team_color ?? colors.border }]} />
          <Text style={[s.txt, !d && { color: colors.muted }]}>{d ? d.name : 'Toque para escolher o piloto'}</Text>
          <Text style={s.chev}>›</Text>
        </Pressable>
        <DriverPicker visible={picking} drivers={drivers} onClose={() => setPicking(false)} onSelect={(code) => onChange({ driver: code })} />
      </>
    );
  }
  if (q.kind === 'position_of_driver') return <PositionPicker value={value?.pos} onChange={(pos) => onChange({ pos })} />;
  if (q.kind === 'yesno') {
    return (
      <Row>
        {[true, false].map((v) => (
          <Pressable key={String(v)} onPress={() => onChange({ v })}
            style={[s.toggle, value?.v === v && { backgroundColor: colors.red, borderColor: colors.red }]}>
            <Text style={s.toggleTxt}>{v ? 'Sim' : 'Não'}</Text>
          </Pressable>
        ))}
      </Row>
    );
  }
  return <Input placeholder="Sua resposta" value={value?.t ?? ''} onChangeText={(t) => onChange({ t })} />;
}

/** Texto curto de uma resposta, pra tabela de palpites. */
export function answerLabel(q: Question, a: any, drivers: Driver[]): string {
  if (!a) return '—';
  const name = (code?: string) => drivers.find((d) => d.code === code)?.code ?? code ?? '—';
  switch (q.kind) {
    case 'podium': return [a.p1, a.p2, a.p3].map(name).join(' · ');
    case 'driver': return name(a.driver);
    case 'position_of_driver': return a.pos === 0 ? 'DNF' : `${a.pos}º`;
    case 'yesno': return a.v ? 'Sim' : 'Não';
    case 'text': return a.t ?? '—';
  }
}

export const KIND_LABEL: Record<Question['kind'], string> = {
  podium: 'Pódio', driver: 'Piloto', position_of_driver: 'Posição de um piloto', yesno: 'Sim ou não', text: 'Texto livre',
};

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), backgroundColor: colors.card2, borderRadius: radius, padding: space(1.5), borderWidth: 1, borderColor: colors.border },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  txt: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  chev: { color: colors.muted, fontSize: 24 },
  toggle: { flex: 1, padding: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card2, alignItems: 'center' },
  toggleTxt: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
