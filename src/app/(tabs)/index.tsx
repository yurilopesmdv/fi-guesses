import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { supabase } from '@/lib/supabase';
import { flag, fmtCountdown } from '@/lib/format';
import { shareInvite } from '@/lib/invite';
import { createPool, joinPool, joinPoolById, listMyPools, listOpenPools, getMyProfile, myPoolsSummary, updateMyProfile } from '@/lib/repo';
import { SEASON, useSeason } from '@/lib/useSeason';
import type { OpenPool, Pool, PoolSummary, Profile } from '@/lib/types';
import { Button, Card, H2, Input, Loading, Muted, P, Pill, Row } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const AVATARS = ['🏎️', '🏁', '🔥', '🦁', '🐆', '🦈', '🚀', '⚡', '🍀', '👑', '🎯', '🐢'];
const MEDAL = ['🥇', '🥈', '🥉'];

export default function Home() {
  const insets = useSafeAreaInsets();
  const season = useSeason();
  const races = season.races.filter((r) => new Date(r.date_utc).getTime() > Date.now());
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [summary, setSummary] = useState<Record<string, PoolSummary>>({});
  const [open, setOpen] = useState<OpenPool[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [panel, setPanel] = useState<'none' | 'create' | 'join' | 'profile'>('none');
  const [name, setName] = useState('');
  const [stake, setStake] = useState('');
  const [scope, setScope] = useState<'season' | 'race'>('race');
  const [raceId, setRaceId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ps, sm, prof, op] = await Promise.all([listMyPools(), myPoolsSummary(), getMyProfile(), listOpenPools()]);
      setPools(ps); setSummary(Object.fromEntries(sm.map((s) => [s.pool_id, s]))); setMe(prof); setOpen(op.filter((o) => !o.is_member));
    } catch (e: any) { Alert.alert('Erro', e.message); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openCreate = () => {
    setPanel(panel === 'create' ? 'none' : 'create');
    if (!raceId) setRaceId(races[0]?.id ?? null);
  };

  const onCreate = async () => {
    if (!name.trim() || (scope === 'race' && !raceId)) return Alert.alert('Falta info', 'Dê um nome e escolha o GP.');
    setBusy(true);
    try {
      const id = await createPool(name.trim(), SEASON, stake.trim() || undefined, scope === 'race' ? raceId! : undefined);
      setPanel('none'); setName(''); setStake('');
      router.push(`/pool/${id}`);
    } catch (e: any) { Alert.alert('Erro', e.message); } finally { setBusy(false); }
  };

  const onJoin = async () => {
    if (code.trim().length < 6) return;
    setBusy(true);
    try { const id = await joinPool(code); setPanel('none'); setCode(''); router.push(`/pool/${id}`); }
    catch (e: any) { Alert.alert('Erro', e.message); } finally { setBusy(false); }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(2), paddingBottom: insets.bottom + space(3) }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Stack.Screen options={{
        headerRight: () => (
          <Pressable onPress={() => setPanel(panel === 'profile' ? 'none' : 'profile')} hitSlop={10}>
            <Text style={{ fontSize: 26 }}>{me?.avatar ?? '🏎️'}</Text>
          </Pressable>
        ),
      }} />

      {panel === 'profile' && me && (
        <Card>
          <H2>Seu perfil</H2>
          <Input value={me.name} onChangeText={(t) => setMe({ ...me, name: t })} placeholder="Nome" />
          <Row style={{ flexWrap: 'wrap' }}>
            {AVATARS.map((a) => (
              <Pressable key={a} onPress={() => setMe({ ...me, avatar: a })}
                style={{ padding: 6, borderRadius: 10, backgroundColor: me.avatar === a ? colors.red : colors.card2 }}>
                <Text style={{ fontSize: 24 }}>{a}</Text>
              </Pressable>
            ))}
          </Row>
          <Button title="Salvar" onPress={async () => { await updateMyProfile({ name: me.name.trim(), avatar: me.avatar }); setPanel('none'); }} />
          <Button title="Sair da conta" variant="ghost" onPress={() => supabase.auth.signOut().then(() => router.replace('/login'))} />
        </Card>
      )}

      <Row style={{ marginBottom: space(1) }}>
        <Button title="+ Criar bolão" style={{ flex: 1 }} onPress={openCreate} />
        <Button title="Tenho um código" variant="ghost" style={{ flex: 1 }} onPress={() => setPanel(panel === 'join' ? 'none' : 'join')} />
      </Row>

      {panel === 'create' && (
        <Card>
          <H2>Novo bolão</H2>
          <Input placeholder="Nome (ex: Família Lopes)" value={name} onChangeText={setName} />
          <Row style={{ marginBottom: space(1) }}>
            {(['race', 'season'] as const).map((sc) => (
              <Pressable key={sc} onPress={() => setScope(sc)} style={{ flex: 1 }}>
                <View style={{ padding: 10, borderRadius: 12, alignItems: 'center', backgroundColor: scope === sc ? colors.red : colors.card2 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{sc === 'race' ? 'Um GP' : 'Temporada inteira'}</Text>
                </View>
              </Pressable>
            ))}
          </Row>
          {scope === 'race' && (races.length === 0 ? <Loading /> : (
            <Row style={{ flexWrap: 'wrap', marginBottom: space(1) }}>
              {races.slice(0, 6).map((r) => (
                <Pressable key={r.id} onPress={() => setRaceId(r.id)}>
                  <Pill color={raceId === r.id ? colors.red : colors.card2}>{flag(r.country)} {r.name}</Pill>
                </Pressable>
              ))}
            </Row>
          ))}
          <Input placeholder="Aposta simbólica (ex: R$ 5 por pessoa) — opcional" value={stake} onChangeText={setStake} />
          <Button title="Criar" onPress={onCreate} loading={busy} />
        </Card>
      )}
      {panel === 'join' && (
        <Card>
          <H2>Entrar num bolão</H2>
          <Input placeholder="Código de 6 letras" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={6} />
          <Button title="Entrar" onPress={onJoin} loading={busy} />
        </Card>
      )}

      <H2 style={{ marginTop: space(1) }}>Meus bolões{pools ? ` (${pools.length})` : ''}</H2>
      {pools === null ? <Loading /> : pools.length === 0 ? (
        <Muted>Você ainda não está em nenhum bolão. Crie um ou entre com o código que te mandaram.</Muted>
      ) : pools.map((p) => {
        const s = summary[p.id];
        const single = season.races.find((r) => r.id === p.race_id);
        const left = s?.next_race_date ? new Date(s.next_race_date).getTime() - Date.now() : null;
        return (
          <Pressable key={p.id} onPress={() => router.push(`/pool/${p.id}`)}>
            <Card>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <P style={{ fontWeight: '800', fontSize: 18 }}>{p.name}</P>
                  <Muted>{p.race_id ? `GP único${single ? ` · ${single.name}` : ''}` : `Temporada ${p.season}`}{p.stake_label ? ` · ${p.stake_label}` : ''}</Muted>
                </View>
                {s && s.members > 1 && <Text style={{ fontSize: 22 }}>{MEDAL[s.my_rank - 1] ?? `${s.my_rank}º`}</Text>}
              </Row>
              <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
                <Pill>👥 {s?.members ?? 1}</Pill>
                <Pill color={colors.card2}>⭐ {s?.my_total ?? 0} pts</Pill>
                {s?.next_race_name && left != null && <Pill color={left < 86400000 ? '#3a2a10' : colors.card2}>🏁 {s.next_race_name} · fecha em {fmtCountdown(left)}</Pill>}
                {s && !s.next_race_name && <Pill>encerrado</Pill>}
              </Row>
              <Pressable onPress={() => shareInvite(p.name, p.invite_code)} style={{ marginTop: space(1) }}>
                <Text style={{ color: colors.red, fontWeight: '700' }}>Convidar pelo WhatsApp · código {p.invite_code} ↗</Text>
              </Pressable>
            </Card>
          </Pressable>
        );
      })}

      {open.length > 0 && (
        <>
          <H2 style={{ marginTop: space(2) }}>Bolões da galera</H2>
          <Muted style={{ marginBottom: space(1) }}>Criados por outros participantes — toque em Participar.</Muted>
          {open.map((o) => (
            <Card key={o.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <P style={{ fontWeight: '800', fontSize: 17 }}>{o.name}</P>
                  <Muted>{o.race_id ? `GP único · ${o.race_name}` : `Temporada ${o.season}`} · por {o.owner_name} · 👥 {o.members}{o.stake_label ? ` · ${o.stake_label}` : ''}</Muted>
                  {o.next_race_date && <Muted>fecha em {fmtCountdown(new Date(o.next_race_date).getTime() - Date.now())}</Muted>}
                </View>
                <Button title="Participar" style={{ marginTop: 0, paddingVertical: 10 }} loading={busy}
                  onPress={async () => { setBusy(true); try { await joinPoolById(o.id); await load(); router.push(`/pool/${o.id}`); } catch (e: any) { Alert.alert('Erro', e.message); } finally { setBusy(false); } }} />
              </Row>
            </Card>
          ))}
        </>
      )}
      <Muted style={{ textAlign: 'center', marginTop: space(3), fontSize: 11 }}>
        versão {Updates.createdAt ? Updates.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'dev'}{Updates.updateId ? ` · ${Updates.updateId.slice(0, 8)}` : ''}
      </Muted>
    </ScrollView>
  );
}
