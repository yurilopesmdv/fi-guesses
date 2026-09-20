import { Pressable, ScrollView, Text } from 'react-native';
import { YEARS } from '@/lib/useYear';
import { colors, space } from '@/ui/theme';

export function YearPicker({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: space(1.5) }}>
      {YEARS.map((y) => (
        <Pressable key={y} onPress={() => onChange(y)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: y === value ? colors.red : colors.card2 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{y}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
