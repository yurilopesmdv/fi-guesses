import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, H1, Input, Muted, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

export default function Login() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [mode, setMode] = useState<'in' | 'up'>(code ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.includes('@') || password.length < 6 || (mode === 'up' && !name.trim())) {
      return Alert.alert('Preencha tudo', 'E-mail válido, senha com 6+ caracteres' + (mode === 'up' ? ' e seu nome.' : '.'));
    }
    setBusy(true);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
    setBusy(false);
    if (res.error) return Alert.alert('Ops', res.error.message);
    router.replace(code ? `/join/${code}` : '/(tabs)');
  };

  return (
    <Screen style={{ justifyContent: 'center', flexGrow: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={{ fontSize: 56, textAlign: 'center' }}>🏎️</Text>
        <H1>Bolão F1</H1>
        <Muted style={{ marginBottom: space(2) }}>{code ? `Convite pro bolão ${code} — ${mode === 'in' ? 'entre' : 'crie sua conta'} pra participar` : mode === 'in' ? 'Entre com sua conta' : 'Crie sua conta'}</Muted>
        {mode === 'up' && <Input placeholder="Seu nome (como aparece no ranking)" value={name} onChangeText={setName} />}
        <Input placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Input placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'in' ? 'password' : 'new-password'} />
        <Button title={mode === 'in' ? 'Entrar' : 'Criar conta'} onPress={submit} loading={busy} />
        <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ padding: space(2), alignItems: 'center' }}>
          <Text style={{ color: colors.muted }}>
            {mode === 'in' ? 'Não tem conta? ' : 'Já tem conta? '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>{mode === 'in' ? 'Criar' : 'Entrar'}</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}
