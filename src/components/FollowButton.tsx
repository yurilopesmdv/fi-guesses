import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { follow, isFollowing, unfollow } from '@/lib/repo';
import type { FollowKind } from '@/lib/types';
import { colors } from '@/ui/theme';

/** Seguir é privado: só alimenta o perfil de quem segue. Não altera palpites nem cria alertas. */
export function FollowButton({ kind, entityId, label }: { kind: FollowKind; entityId: string | null; label: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setOn(null);
    if (entityId) isFollowing(kind, entityId).then((v) => { if (active) setOn(v); }).catch(() => { if (active) setOn(false); });
    return () => { active = false; };
  }, [kind, entityId]);
  if (!entityId || on === null) return null;
  const toggle = async () => {
    setBusy(true); setError('');
    try { await (on ? unfollow(kind, entityId) : follow(kind, entityId)); setOn(!on); }
    catch (e: any) { setError(e.message ?? 'Não foi possível atualizar.'); }
    finally { setBusy(false); }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={on ? `Deixar de seguir ${label}` : `Seguir ${label}`} accessibilityState={{ selected: on, busy }}
      disabled={busy} onPress={() => void toggle()}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        backgroundColor: on ? colors.card2 : colors.red, opacity: busy ? 0.6 : 1 }}>
      <Ionicons name={on ? 'star' : 'star-outline'} size={16} color={on ? colors.gold : colors.text} />
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{error ? 'Tentar novamente' : on ? 'Seguindo' : 'Seguir'}</Text>
    </Pressable>
  );
}
