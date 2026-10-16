import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { PoolProvider, usePool } from '@/lib/usePool';
import { useAuth } from '@/lib/auth';
import { Button, H2, Loading, Muted, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function PoolLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  if (auth.loading) return <Screen scroll={false}><Loading /></Screen>;
  if (!auth.session) return <Redirect href="/login" />;
  return (
    <PoolProvider key={id} id={id}>
      <PoolStack />
    </PoolProvider>
  );
}

function PoolStack() {
  const { pool, loading, error, reload } = usePool();
  if (loading && !pool) return <Screen scroll={false}><Loading /></Screen>;
  if (error) return (
    <Screen>
      <H2>Bolão indisponível</H2>
      <Muted>{error}</Muted>
      <Button title="Tentar novamente" variant="ghost" onPress={reload} />
      <Button title="Voltar aos bolões" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
  return <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="race/[raceId]" options={{ title: 'Corrida' }} />
        <Stack.Screen name="admin/[raceId]" options={{ title: 'Apuração' }} />
      </Stack>;
}
