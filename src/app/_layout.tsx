import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';
import { SeasonProvider } from '@/lib/useSeason';
import { useOtaUpdate } from '@/lib/useOtaUpdate';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  useOtaUpdate();
  return (
    <AuthProvider>
      <SeasonProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.bg },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="pool/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="race/[id]" options={{ title: 'Corrida' }} />
          <Stack.Screen name="driver/[id]" options={{ title: 'Piloto' }} />
          <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
        </Stack>
      </SeasonProvider>
    </AuthProvider>
  );
}
