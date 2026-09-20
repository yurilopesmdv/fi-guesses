import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { usePool } from '@/lib/usePool';
import { colors } from '@/ui/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) =>
  <Ionicons name={name} color={color as string} size={size} />;

export default function PoolTabs() {
  const { pool } = usePool();
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' },
      headerTitle: pool?.name ?? 'Bolão',
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.red, tabBarInactiveTintColor: colors.muted,
      sceneStyle: { backgroundColor: colors.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Palpite', tabBarIcon: icon('flag') }} />
      <Tabs.Screen name="standings" options={{ title: 'Ranking', tabBarIcon: icon('trophy') }} />
      <Tabs.Screen name="races" options={{ title: 'Pontos', tabBarIcon: icon('list'), href: pool?.race_id ? null : undefined }} />
      <Tabs.Screen name="members" options={{ title: 'Galera', tabBarIcon: icon('people') }} />
    </Tabs>
  );
}
