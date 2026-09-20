import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Loading, Screen } from '@/ui/primitives';

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <Screen scroll={false}><Loading /></Screen>;
  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
