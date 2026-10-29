import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { colors } from '@/ui/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) =>
  <Ionicons name={name} color={color as string} size={size} />;

export default function RootTabs() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '800' },
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      tabBarLabelStyle: { fontSize: 10 },
      tabBarActiveTintColor: colors.red, tabBarInactiveTintColor: colors.muted,
      sceneStyle: { backgroundColor: colors.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Bolões', headerTitle: 'Bolão F1', tabBarIcon: icon('trophy') }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking', headerTitle: 'Ranking geral', tabBarIcon: icon('podium') }} />
      <Tabs.Screen name="races" options={{ title: 'Corridas', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="f1" options={{ title: 'F1', headerTitle: 'Campeonato', tabBarIcon: icon('speedometer') }} />
      <Tabs.Screen name="circuits" options={{ title: 'Pistas', tabBarIcon: icon('map') }} />
      <Tabs.Screen name="live" options={{ title: 'Notícias', tabBarIcon: icon('newspaper') }} />
    </Tabs>
  );
}
