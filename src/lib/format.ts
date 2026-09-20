// Sempre em horário de Brasília, independente do fuso do celular
const TZ = 'America/Sao_Paulo';
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

type SessionRace = { series?: string; fp1_utc: string | null; fp2_utc: string | null; fp3_utc: string | null; sprint_quali_utc: string | null; sprint_utc: string | null; quali_utc: string | null; date_utc: string };
export const raceSessions = (r: SessionRace) =>
  (r.series && r.series !== 'f1' ? [
    ['Treino', r.fp1_utc], ['Classificação', r.quali_utc], ['Sprint Race', r.sprint_utc], ['Feature Race', r.date_utc],
  ] as [string, string | null][] : [
    ['Treino Livre 1', r.fp1_utc], ['Treino Livre 2', r.fp2_utc], ['Treino Livre 3', r.fp3_utc],
    ['Sprint Quali', r.sprint_quali_utc], ['Sprint', r.sprint_utc], ['Classificação', r.quali_utc], ['Corrida', r.date_utc],
  ] as [string, string | null][])
    .filter((x): x is [string, string] => Boolean(x[1]))
    .sort((a, b) => a[1].localeCompare(b[1]));

export const fmtCountdown = (ms: number) => {
  if (ms <= 0) return 'fechado';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}min`;
  return `${mm}min`;
};

export const lockTime = (raceDateUtc: string, lockMinutesBefore: number) =>
  new Date(raceDateUtc).getTime() - lockMinutesBefore * 60000;

export const FLAGS: Record<string, string> = {
  Australia: '🇦🇺', China: '🇨🇳', Japan: '🇯🇵', Bahrain: '🇧🇭', 'Saudi Arabia': '🇸🇦', USA: '🇺🇸', 'United States': '🇺🇸',
  Canada: '🇨🇦', Monaco: '🇲🇨', Spain: '🇪🇸', Austria: '🇦🇹', UK: '🇬🇧', 'Great Britain': '🇬🇧', Belgium: '🇧🇪',
  Hungary: '🇭🇺', Netherlands: '🇳🇱', Italy: '🇮🇹', Azerbaijan: '🇦🇿', Singapore: '🇸🇬', Mexico: '🇲🇽',
  Brazil: '🇧🇷', Qatar: '🇶🇦', UAE: '🇦🇪',
};
export const flag = (country: string | null) => (country && FLAGS[country]) || '🏁';
