import { Pressable, Text, View } from 'react-native';
import { SERIES_LABEL, type Series } from '@/lib/types';
import { Row } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const ALL: Series[] = ['f1', 'f2', 'f3'];

/** F1 / F2 / F3 — F2 e F3 só existem pra temporada atual. */
export function SeriesPicker({ value, onChange, onlyF1 }: { value: Series; onChange: (s: Series) => void; onlyF1?: boolean }) {
  return (
    <Row style={{ marginBottom: space(1) }}>
      {ALL.map((s) => {
        const off = onlyF1 && s !== 'f1';
        return (
          <Pressable key={s} disabled={off} onPress={() => onChange(s)} style={{ flex: 1 }}>
            <View style={{ padding: 8, borderRadius: 10, alignItems: 'center', backgroundColor: value === s ? colors.red : colors.card2, opacity: off ? 0.35 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{SERIES_LABEL[s]}</Text>
            </View>
          </Pressable>
        );
      })}
    </Row>
  );
}
