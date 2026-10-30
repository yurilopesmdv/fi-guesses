import { raceSessions } from './format';
import { SERIES_LABEL, type Race } from './types';

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const day = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).replace(/-/g, '');
const esc = (t: string) => t.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

/**
 * Arquivo iCalendar simples (não é assinatura: mudanças de horário exigem exportar de novo).
 * UID estável por categoria/temporada/etapa/sessão para o calendário substituir eventos ao reimportar.
 * Horários a confirmar viram um evento de dia inteiro, sem horário inventado.
 */
export function buildIcs(races: Race[], now = new Date().toISOString()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bolao F1//PT-BR', 'CALSCALE:GREGORIAN'];
  for (const r of races) {
    const label = SERIES_LABEL[r.series];
    const base = `${r.series}-${r.season}-${r.round}`;
    const location = [r.circuit, r.country].filter(Boolean).join(', ');
    const sessions = r.times_tbc ? [] : raceSessions(r);
    if (!sessions.length) {
      const next = new Date(new Date(r.date_utc).getTime() + 86400000).toISOString();
      lines.push('BEGIN:VEVENT', `UID:${base}-weekend@bolao-f1`, `DTSTAMP:${stamp(now)}`, `DTSTART;VALUE=DATE:${day(r.date_utc)}`, `DTEND;VALUE=DATE:${day(next)}`,
        `SUMMARY:${esc(`${label} · ${r.name} (horários a confirmar)`)}`, `LOCATION:${esc(location)}`, 'END:VEVENT');
      continue;
    }
    for (const [name, iso] of sessions) {
      const minutes = /Corrida|Feature/.test(name) ? 120 : 60;
      lines.push('BEGIN:VEVENT', `UID:${base}-${slug(name)}@bolao-f1`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(iso)}`,
        `DTEND:${stamp(new Date(new Date(iso).getTime() + minutes * 60000).toISOString())}`,
        `SUMMARY:${esc(`${label} · ${r.name} · ${name}`)}`, `LOCATION:${esc(location)}`, 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
