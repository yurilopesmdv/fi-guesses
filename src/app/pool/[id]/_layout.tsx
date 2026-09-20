import { Stack, useLocalSearchParams } from 'expo-router';
import { PoolProvider } from '@/lib/usePool';
import { colors } from '@/ui/theme';

export default function PoolLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PoolProvider id={id}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="race/[raceId]" options={{ title: 'Corrida' }} />
        <Stack.Screen name="admin/[raceId]" options={{ title: 'Apuração' }} />
      </Stack>
    </PoolProvider>
  );
}
