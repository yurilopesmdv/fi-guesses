import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

const OPTIONS = Array.from({ length: 23 }, (_, i) => i); // 0..22
const label = (n: number) => (n === 0 ? 'Abandonou (DNF)' : `${n}º lugar`);

/** Seleção de posição sem teclado: abre uma grade de 0 (abandonou) a 22. */
export function PositionPicker({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={s.box}>
        <Text style={[s.txt, value == null && { color: colors.muted }]}>{value != null ? label(value) : 'Toque para escolher a posição'}</Text>
        <Text style={s.chev}>›</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[s.wrap, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom }]}>
          <Text style={s.title}>Em que posição?</Text>
          <ScrollView contentContainerStyle={s.grid}>
            {OPTIONS.map((n) => (
              <Pressable key={n} onPress={() => { onChange(n); setOpen(false); }}
                style={[s.cell, n === 0 && s.dnf, value === n && { backgroundColor: colors.red, borderColor: colors.red }]}>
                <Text style={s.cellTxt}>{n === 0 ? 'DNF' : `${n}º`}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button title="Fechar" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card2, borderRadius: radius, padding: space(1.5), borderWidth: 1, borderColor: colors.border },
  txt: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  chev: { color: colors.muted, fontSize: 24 },
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space(2) },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: space(1.5) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  cell: { width: '22%', flexGrow: 1, paddingVertical: 18, borderRadius: radius, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dnf: { width: '100%', backgroundColor: '#2a1a1a' },
  cellTxt: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
