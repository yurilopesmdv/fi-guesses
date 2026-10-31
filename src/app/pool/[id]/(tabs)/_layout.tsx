import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View, type ColorValue } from 'react-native';
import { usePool } from '@/lib/usePool';
import { colors } from '@/ui/theme';
import { poolStatusLabel } from '@/lib/poolStatus';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) =>
  <Ionicons name={name} color={color as string} size={size} />;

export default function PoolTabs() {
  const { pool, lifecycle } = usePool();
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' },
      headerTitle: () => <View style={{ maxWidth: 270 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{pool?.name ?? 'Bolão'}</Text>
        <Text style={{ color: lifecycle?.status === 'ongoing' ? colors.green : colors.muted, fontSize: 12 }}>{poolStatusLabel(lifecycle)}</Text>
      </View>,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.red, tabBarInactiveTintColor: colors.muted,
      sceneStyle: { backgroundColor: colors.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Palpite', tabBarIcon: icon('flag') }} />
      <Tabs.Screen name="gp" options={{ title: 'GP', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="standings" options={{ title: 'Ranking', tabBarIcon: icon('trophy') }} />
      {/* Pontos por etapa agora é seção do Ranking. */}
      <Tabs.Screen name="races" options={{ title: 'Pontos', href: null }} />
      <Tabs.Screen name="members" options={{ title: 'Galera', tabBarIcon: icon('people') }} />
    </Tabs>
  );
}
