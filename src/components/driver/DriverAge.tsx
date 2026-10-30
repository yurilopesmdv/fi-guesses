import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ageAt, nationalityLabel } from '@/lib/nationality';
import { getDriverAges, type DriverAges } from '@/lib/repo';
import { colors } from '@/ui/theme';

function Chip({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ backgroundColor: colors.card2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 76 }}>
      <Text style={{ color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

/** Nacionalidade e marcos por idade (H23). Some quando a fonte não tem nascimento. */
export function DriverAge({ driverId, active }: { driverId: string; active: boolean }) {
  const [a, setA] = useState<DriverAges | null>(null);
  useEffect(() => {
    let on = true;
    setA(null);
    getDriverAges(driverId).then((v) => { if (on) setA(v); }).catch(() => {});
    return () => { on = false; };
  }, [driverId]);
  if (!a?.date_of_birth) return null;
  const b = a.date_of_birth;
  const chips: [string, string][] = [];
  chips.push([`${ageAt(b, active ? new Date().toISOString() : a.last_race ?? new Date().toISOString())} anos`, active ? 'idade' : 'na última corrida']);
  if (a.debut) chips.push([`${ageAt(b, a.debut)} anos`, 'na estreia']);
  if (a.first_win) chips.push([`${ageAt(b, a.first_win)} anos`, '1ª vitória']);
  if (a.last_win && a.last_win !== a.first_win) chips.push([`${ageAt(b, a.last_win)} anos`, 'última vitória']);
  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      {a.nationality ? <Text style={{ color: colors.muted, fontSize: 13 }}>{nationalityLabel(a.nationality)} · nascido em {new Date(`${b}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{chips.map(([v, l]) => <Chip key={l} value={v} label={l} />)}</View>
    </View>
  );
}
