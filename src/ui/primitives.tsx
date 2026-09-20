import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';
import {
  ActivityIndicator, Dimensions, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from './theme';

// Rolagem até o campo focado: a Screen expõe o scroll; o Input pede pra ficar visível ao ganhar foco
const ScrollCtx = createContext<{ reveal: (el: any) => void }>({ reveal: () => {} });

export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: object }) {
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const kb = useRef(0);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => { kb.current = e.endCoordinates.height; });
    const b = Keyboard.addListener('keyboardDidHide', () => { kb.current = 0; });
    return () => { a.remove(); b.remove(); };
  }, []);
  const reveal = (el: any) => {
    // espera o teclado abrir, mede o campo na tela e rola o necessário pra ele ficar acima do teclado
    setTimeout(() => {
      el?.measureInWindow?.((_x: number, y: number, _w: number, h: number) => {
        const visibleBottom = Dimensions.get('window').height - (kb.current || 300) - 16;
        if (y + h > visibleBottom) ref.current?.scrollTo({ y: scrollY.current + (y + h - visibleBottom) + 60, animated: true });
      });
    }, 350);
  };
  const pad = { paddingTop: space(1), paddingBottom: insets.bottom + space(3), paddingHorizontal: space(2) };
  if (!scroll) return <View style={[s.screen, pad, style]}>{children}</View>;
  return (
    <ScrollCtx.Provider value={{ reveal }}>
      <ScrollView ref={ref} style={s.screen} contentContainerStyle={[pad, { paddingBottom: insets.bottom + space(3) + 320 }, style]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32}>
        {children}
      </ScrollView>
    </ScrollCtx.Provider>
  );
}

export const Card = ({ style, ...p }: ViewProps) => <View style={[s.card, style]} {...p} />;
export const Row = ({ style, ...p }: ViewProps) => <View style={[s.row, style]} {...p} />;

export const H1 = ({ children }: { children: ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.h2, style]}>{children}</Text>;
export const P = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.p, style]}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.muted, style]}>{children}</Text>;

export function Button({
  title, onPress, variant = 'primary', disabled, loading, style,
}: { title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; style?: object }) {
  const bg = variant === 'primary' ? colors.red : variant === 'danger' ? '#7F1D1D' : colors.card2;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{title}</Text>}
    </Pressable>
  );
}

export const Input = (p: TextInputProps) => {
  const { reveal } = useContext(ScrollCtx);
  const ref = useRef<TextInput>(null);
  return (
    <TextInput ref={ref} placeholderTextColor={colors.muted} style={[s.input, p.style]} {...p}
      onFocus={(e) => { reveal(ref.current); p.onFocus?.(e); }} />
  );
};

export const Pill = ({ children, color = colors.card2 }: { children: ReactNode; color?: string }) => (
  <View style={[s.pill, { backgroundColor: color }]}><Text style={s.pillText}>{children}</Text></View>
);

export const Loading = () => (
  <View style={{ padding: space(4), alignItems: 'center' }}><ActivityIndicator color={colors.red} /></View>
);

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space(2), marginBottom: space(1.5), borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: space(1.5) },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: space(1) },
  p: { color: colors.text, fontSize: 16 },
  muted: { color: colors.muted, fontSize: 14 },
  btn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius, alignItems: 'center', marginTop: space(1) },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  input: { backgroundColor: colors.card2, color: colors.text, borderRadius: radius, padding: 14, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: space(1) },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: colors.text, fontSize: 12, fontWeight: '600' },
});
