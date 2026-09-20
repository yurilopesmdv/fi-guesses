import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Driver } from '@/lib/types';
import { canOpenDriver, openDriver } from '@/lib/nav';
import { Button, Input, Muted } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

type Props = {
  visible: boolean;
  drivers: Driver[];
  title?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

/** Lista de pilotos com busca por nome, código, número ou equipe. */
export function DriverPicker({ visible, drivers, title = 'Escolha o piloto', onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const insets = useSafeAreaInsets();
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return drivers;
    return drivers.filter((d) =>
      [d.name, d.code, d.team ?? '', String(d.number ?? '')].some((v) => v.toLowerCase().includes(t)),
    );
  }, [q, drivers]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.wrap, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom }]}>
        <Text style={s.title}>{title}</Text>
        <Input placeholder="Buscar: nome, número, equipe…" value={q} onChangeText={setQ} autoFocus autoCorrect={false} />
        <FlatList
          data={list}
          keyExtractor={(d) => d.code}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space(3) }}>Nenhum piloto encontrado</Muted>}
          renderItem={({ item }) => <DriverRow d={item} onPress={() => { onSelect(item.code); setQ(''); onClose(); }} />}
        />
        <Button title="Fechar" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

export function DriverRow({ d, onPress, info = true }: { d: Driver; onPress?: () => void; info?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <View style={[s.stripe, { backgroundColor: d.team_color ?? colors.muted }]} />
      <Text style={s.num}>{d.number ?? '–'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{d.name}</Text>
        <Muted>{d.team ?? ''}</Muted>
      </View>
      <Text style={s.code}>{d.code}</Text>
      {info && canOpenDriver(d) && (
        <Pressable hitSlop={10} onPress={() => openDriver(d)} style={s.info}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 12 }}>i</Text></Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space(2) },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: space(1.5) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), backgroundColor: colors.card, borderRadius: radius, padding: space(1.5), marginBottom: space(1) },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  num: { color: colors.muted, fontWeight: '800', width: 28, textAlign: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  code: { color: colors.muted, fontWeight: '700' },
  info: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
});
