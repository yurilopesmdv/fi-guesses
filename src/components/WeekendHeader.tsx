import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { flag, fmtCountdown, raceSessions } from '@/lib/format';
import { SERIES_LABEL, type Race } from '@/lib/types';
import { colors, radius } from '@/ui/theme';
import { CircuitLink } from './circuits/CircuitLink';

const TZ = 'America/Sao_Paulo';
const SHORT: Record<string, string> = { 'Treino Livre 1': 'TL1', 'Treino Livre 2': 'TL2', 'Treino Livre 3': 'TL3', 'Sprint Quali': 'Sprint Q', Sprint: 'Sprint', 'Classificação': 'Qualy', Corrida: 'Corrida', Treino: 'Treino', 'Sprint Race': 'Sprint', 'Feature Race': 'Feature' };
const LONG: Record<string, string> = { Qualy: 'Classificação', 'Sprint Q': 'Classificação Sprint', TL1: 'Treino livre 1', TL2: 'Treino livre 2', TL3: 'Treino livre 3' };
const wd = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'short' }).replace('.', '');
const hm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const LIVE_MS = 2 * 3600000;

/** Cabeçalho do fim de semana: próxima sessão em destaque e todas as sessões numa faixa (horário de Brasília). */
export function WeekendHeader({ race, lockAt, status, children }: { race: Race; lockAt?: number; status?: React.ReactNode; children?: React.ReactNode }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const sessions = race.times_tbc ? [] : raceSessions(race).map(([n, iso]) => ({ label: SHORT[n] ?? n, iso, t: Date.parse(iso) }));
  const live = sessions.find((s) => now >= s.t && now < s.t + LIVE_MS);
  const next = sessions.find((s) => s.t > now);
  const focus = live ?? next;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, gap: 10 }}>
      {status}
      <View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{flag(race.country)} {race.series !== 'f1' ? `${SERIES_LABEL[race.series]} · ` : ''}{race.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{race.circuit ?? ''}{race.round ? ` · Rodada ${race.round}` : ''}{race.has_sprint ? ' · Sprint ⚡' : ''}</Text>
        <CircuitLink race={race} />
      </View>
      {lockAt != null && (
        <Text style={{ color: now < lockAt ? colors.green : colors.muted, fontWeight: '700', fontSize: 13 }}>
          {now < lockAt ? `Palpites fecham em ${fmtCountdown(lockAt - now)}` : 'Palpites encerrados'}
        </Text>
      )}
      {race.times_tbc ? (
        <Text style={{ color: colors.muted }}>Horários ainda não divulgados · fim de semana de {new Date(race.date_utc).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' })}</Text>
      ) : focus ? (
        <View style={{ backgroundColor: live ? '#2a1214' : colors.card2, borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: colors.red }}>
          <Text style={{ color: live ? colors.red : colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{live ? '● AO VIVO AGORA' : 'PRÓXIMA SESSÃO'}</Text>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 2 }}>{LONG[focus.label] ?? focus.label} · {wd(focus.iso)} {hm(focus.iso)}</Text>
          {!live && <Text style={{ color: colors.gold, fontWeight: '700', marginTop: 2 }}>em {fmtCountdown(focus.t - now)}</Text>}
        </View>
      ) : sessions.length ? <Text style={{ color: colors.muted }}>Fim de semana encerrado</Text> : null}
      {sessions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {sessions.map((s) => {
            const past = s.t + LIVE_MS <= now, isFocus = s === focus;
            return (
              <View key={s.label + s.iso} accessible accessibilityLabel={`${LONG[s.label] ?? s.label}, ${wd(s.iso)} ${hm(s.iso)}${past ? ', encerrada' : ''}`}
                style={{ minWidth: 70, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: isFocus ? '#2a1214' : colors.card2, borderWidth: 1, borderColor: isFocus ? colors.red : 'transparent', opacity: past ? 0.5 : 1 }}>
                <Text style={{ color: isFocus ? colors.text : colors.muted, fontSize: 11, fontWeight: '800' }}>{s.label.toUpperCase()}{past ? ' ✓' : ''}</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{wd(s.iso)} {hm(s.iso)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
      {sessions.length > 0 && <Text style={{ color: colors.muted, fontSize: 11 }}>Horário de Brasília</Text>}
      {children}
    </View>
  );
}
