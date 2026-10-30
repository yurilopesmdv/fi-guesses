import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { getDriverTeammates, type Teammate } from '@/lib/repo';
import { H2 } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const years = (a: number, b: number) => (a === b ? String(a) : `${a}–${String(b).slice(2)}`);

/** Rede de companheiros (H14): cartões roláveis; tocar abre o companheiro e continua a navegação pela rede. */
export function Teammates({ driverId }: { driverId: string }) {
  const [rows, setRows] = useState<Teammate[] | null>(null);
  useEffect(() => {
    let active = true;
    setRows(null);
    getDriverTeammates(driverId).then((v) => { if (active) setRows(v); }).catch(() => {});
    return () => { active = false; };
  }, [driverId]);
  if (!rows?.length) return null;
  return (
    <>
      <H2 style={{ marginTop: space(1) }}>🤝 Companheiros de equipe · {rows.length}</H2>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 6 }} style={{ marginBottom: 12 }}>
        {rows.map((t) => {
          const total = t.ahead + t.behind;
          return (
            <Pressable key={t.driver_id} accessibilityRole="button" accessibilityLabel={`${t.name}: ${t.ahead} a ${t.behind} em ${t.races} GPs`} onPress={() => router.push(`/driver/${t.driver_id}`)}
              style={{ width: 150, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {t.headshot_url ? <Image source={{ uri: t.headshot_url }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card2 }} contentFit="cover" />
                  : <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontWeight: '800' }}>{(t.name ?? '?')[0]}</Text></View>}
                <Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={2}>{t.name ?? t.driver_id}</Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{t.teams} · {years(t.from, t.to)}</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                <Text style={{ color: t.ahead >= t.behind ? colors.gold : colors.text }}>{t.ahead}</Text> × {t.behind}
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '400' }}>  em {t.races} GPs</Text>
              </Text>
              <View style={{ flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.card2 }}>
                {total > 0 && <><View style={{ flex: t.ahead, backgroundColor: colors.gold }} /><View style={{ flex: t.behind, backgroundColor: colors.border }} /></>}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
