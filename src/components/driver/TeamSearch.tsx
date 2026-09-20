import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchTeams } from '@/lib/repo';
import type { TeamSearchRow } from '@/lib/types';
import { Button, Input, Muted } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

export function TeamSearch({ visible, onClose, onSelect, exclude }: { visible: boolean; onClose: () => void; onSelect: (t: TeamSearchRow) => void; exclude?: string }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<TeamSearchRow[]>([]);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => searchTeams(q.trim()).then((r) => setRows(r.filter((x) => x.team !== exclude))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, visible, exclude]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.wrap, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom }]}>
        <Text style={s.title}>Comparar com…</Text>
        <Input placeholder="Nome da equipe (qualquer época)" value={q} onChangeText={setQ} autoFocus autoCorrect={false} />
        <FlatList data={rows} keyExtractor={(t) => t.team} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space(3) }}>Nenhuma equipe</Muted>}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onSelect(item); setQ(''); onClose(); }} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
              <View style={[s.stripe, { backgroundColor: item.team_color ?? colors.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.team}</Text>
                <Muted>{item.first_season}–{item.last_season}</Muted>
              </View>
              <Muted>{item.titles ? `${item.titles}🏆 ` : ''}{item.wins} vit.</Muted>
            </Pressable>
          )} />
        <Button title="Fechar" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space(2) },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: space(1.5) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), backgroundColor: colors.card, borderRadius: radius, padding: space(1.5), marginBottom: space(1) },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
