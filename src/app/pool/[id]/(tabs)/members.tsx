import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { shareInvite } from '@/lib/invite';
import { useFocusEffect } from 'expo-router';
import { useUserId } from '@/lib/auth';
import { listStandings, updatePool } from '@/lib/repo';
import type { Standing } from '@/lib/types';
import { usePool } from '@/lib/usePool';
import { Button, Card, H2, Input, Loading, Muted, P, Row, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function Members() {
  const { pool, reload } = usePool();
  const uid = useUserId();
  const [rows, setRows] = useState<Standing[] | null>(null);
  const [lock, setLock] = useState('');
  const [stake, setStake] = useState('');
  useFocusEffect(useCallback(() => {
    if (!pool) return;
    listStandings(pool.id).then(setRows);
    setLock(String(pool.lock_minutes_before)); setStake(pool.stake_label ?? '');
  }, [pool]));

  if (!pool || rows === null) return <Screen scroll={false}><Loading /></Screen>;
  const isOwner = pool.owner_id === uid;

  return (
    <Screen>
      <Card>
        <H2>Convite</H2>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 4 }}>{pool.invite_code}</Text>
          <Button title="Enviar no WhatsApp" variant="ghost" style={{ marginTop: 0 }}
            onPress={() => shareInvite(pool.name, pool.invite_code)} />
        </Row>
      </Card>
      <H2>Participantes ({rows.length})</H2>
      {rows.map((m) => (
        <Card key={m.user_id}>
          <Row>
            <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
            <View style={{ flex: 1 }}><P style={{ fontWeight: '700' }}>{m.name}</P></View>
            {m.user_id === pool.owner_id && <Muted>organizador</Muted>}
          </Row>
        </Card>
      ))}
      {isOwner && (
        <Card>
          <H2>Configurações</H2>
          <Muted>Aposta simbólica</Muted>
          <Input value={stake} onChangeText={setStake} placeholder="ex: R$ 5 por pessoa" />
          <Muted>Fechar palpites X minutos antes da largada (0 = na largada)</Muted>
          <Input value={lock} onChangeText={setLock} keyboardType="number-pad" />
          <Button title="Salvar" onPress={async () => {
            try { await updatePool(pool.id, { stake_label: stake.trim() || null, lock_minutes_before: parseInt(lock, 10) || 0 }); reload(); Alert.alert('Salvo'); }
            catch (e: any) { Alert.alert('Erro', e.message); }
          }} />
        </Card>
      )}
    </Screen>
  );
}
