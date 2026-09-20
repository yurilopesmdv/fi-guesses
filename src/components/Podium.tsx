import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DriverPicker } from './DriverPicker';
import type { Driver, PodiumAnswer } from '@/lib/types';
import { colors, radius, space } from '@/ui/theme';

const SLOTS: { key: keyof PodiumAnswer; label: string; color: string }[] = [
  { key: 'p1', label: '1º', color: colors.gold },
  { key: 'p2', label: '2º', color: colors.silver },
  { key: 'p3', label: '3º', color: colors.bronze },
];

type Props = {
  value: PodiumAnswer;
  drivers: Driver[];
  onChange?: (v: PodiumAnswer) => void;
  /** pódio oficial — quando presente, pinta acerto (3), quase (1) e erro */
  result?: PodiumAnswer | null;
};

export function Podium({ value, drivers, onChange, result }: Props) {
  const [picking, setPicking] = useState<keyof PodiumAnswer | null>(null);
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));
  const podium = result ? [result.p1, result.p2, result.p3] : [];

  const mark = (key: keyof PodiumAnswer) => {
    if (!result || !value[key]) return null;
    if (value[key] === result[key]) return { txt: '+3', color: colors.green };
    if (podium.includes(value[key])) return { txt: '+1', color: colors.gold };
    return { txt: '0', color: colors.muted };
  };

  return (
    <View>
      {SLOTS.map(({ key, label, color }) => {
        const d = value[key] ? byCode[value[key]!] : undefined;
        const m = mark(key);
        return (
          <Pressable
            key={key}
            disabled={!onChange}
            onPress={() => setPicking(key)}
            style={({ pressed }) => [s.slot, pressed && { opacity: 0.8 }]}
          >
            <Text style={[s.pos, { color }]}>{label}</Text>
            <View style={[s.stripe, { backgroundColor: d?.team_color ?? colors.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.name, !d && { color: colors.muted }]}>{d ? d.name : 'Toque para escolher'}</Text>
              {d && <Text style={s.team}>{d.team}</Text>}
            </View>
            {m ? <Text style={[s.mark, { color: m.color }]}>{m.txt}</Text> : onChange && d ? (
              <Pressable hitSlop={12} onPress={() => { const next = { ...value }; delete next[key]; onChange(next); }}>
                <Text style={s.clear}>✕</Text>
              </Pressable>
            ) : onChange && <Text style={s.chev}>›</Text>}
          </Pressable>
        );
      })}
      <DriverPicker
        visible={picking !== null}
        drivers={drivers}
        title={picking ? `Quem chega em ${SLOTS.find((x) => x.key === picking)!.label}?` : ''}
        onClose={() => setPicking(null)}
        onSelect={(code) => {
          if (!picking || !onChange) return;
          const next: PodiumAnswer = { ...value };
          // mesmo piloto não pode ocupar dois lugares
          (Object.keys(next) as (keyof PodiumAnswer)[]).forEach((k) => { if (next[k] === code) delete next[k]; });
          next[picking] = code;
          onChange(next);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  slot: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), backgroundColor: colors.card2, borderRadius: radius, padding: space(1.5), marginBottom: space(1) },
  pos: { fontSize: 20, fontWeight: '900', width: 34 },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  team: { color: colors.muted, fontSize: 13 },
  chev: { color: colors.muted, fontSize: 24 },
  clear: { color: colors.muted, fontSize: 16, fontWeight: '800', padding: 4 },
  mark: { fontSize: 18, fontWeight: '900' },
});
