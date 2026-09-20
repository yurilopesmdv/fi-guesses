import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchDrivers } from '@/lib/repo';
import type { DriverSearchRow } from '@/lib/types';
import { Button, Input, Muted } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

/** Busca de piloto de qualquer época (pra comparação). */
export function DriverSearch({ visible, onClose, onSelect, exclude }: { visible: boolean; onClose: () => void; onSelect: (d: DriverSearchRow) => void; exclude?: string }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DriverSearchRow[]>([]);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => searchDrivers(q.trim()).then((r) => setRows(r.filter((d) => d.driver_id !== exclude))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, visible, exclude]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.wrap, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom }]}>
        <Text style={s.title}>Comparar com…</Text>
        <Input placeholder="Nome do piloto (qualquer época)" value={q} onChangeText={setQ} autoFocus autoCorrect={false} />
        <FlatList data={rows} keyExtractor={(d) => d.driver_id} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space(3) }}>Nenhum piloto</Muted>}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onSelect(item); setQ(''); onClose(); }} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
              <View style={[s.stripe, { backgroundColor: item.team_color ?? colors.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Muted>{item.first_season}–{item.last_season} · {item.team ?? '—'}</Muted>
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
