import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { joinPool } from '@/lib/repo';
import { Loading, Muted, Screen } from '@/ui/primitives';

/** Deep link de convite: bolaof1://join/CODIGO — entra no bolão (pedindo login antes se preciso). */
export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading || !session || !code) return;
    joinPool(code)
      .then((id) => router.replace(`/pool/${id}`))
      .catch((e) => { Alert.alert('Convite inválido', e.message); router.replace('/(tabs)'); });
  }, [loading, session, code]);

  if (!loading && !session) return <Redirect href={{ pathname: '/login', params: { code } }} />;
  return <Screen scroll={false}><Loading /><Muted style={{ textAlign: 'center' }}>Entrando no bolão {code}…</Muted></Screen>;
}
