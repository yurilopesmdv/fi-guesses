import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { flag } from '@/lib/format';
import { getF1OnThisDay, type OnThisDay as Item } from '@/lib/repo';
import { Card, Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const TZ = 'America/Sao_Paulo';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }).split('-').map(Number);
const dm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });

/** GPs disputados nesta data (±3 dias) ao longo da história. Separado da curiosidade diária de notícias. */
export function OnThisDay() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    let active = true;
    const [, m, d] = today();
    getF1OnThisDay(m, d).then((v) => { if (active) setItems(v); }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!items?.length) return null;
  const [y] = today();
  return (
    <Card style={{ borderColor: colors.border }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.red, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 }}>NESTE DIA NA F1</Text>
        <Muted style={{ fontSize: 12 }}>{dm(new Date().toISOString())}</Muted>
      </Row>
      {items.slice(0, 3).map((g) => (
        <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.name} ${g.season}, vencido por ${g.winner.name}`} onPress={() => router.push(`/race/${g.id}`)}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 6 }}>
          <View style={{ width: 52, alignItems: 'center' }}>
            <Text style={{ color: colors.gold, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{g.season}</Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>há {y - g.season} anos</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{flag(g.country)} {g.name}{g.dist ? ` · ${dm(g.date_utc)}` : ''}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>🏆 {g.winner.name}{g.winner.team ? ` · ${g.winner.team}` : ''}</Text>
          </View>
          <Text style={{ color: colors.muted }}>›</Text>
        </Pressable>
      ))}
    </Card>
  );
}
