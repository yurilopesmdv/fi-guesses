import type { CircuitCalendar, CircuitLayout, CircuitSummary } from './types';

export const circuitDirection = (direction: CircuitLayout['direction']) => ({clockwise:'Horário',anticlockwise:'Anti-horário',figure_eight:'Em oito'})[direction];
export const circuitLength = (meters: number) => `${(meters / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} km`;
export const circuitCountry = (country: string) => ({Australia:'Austrália',China:'China',Japan:'Japão',USA:'Estados Unidos',Canada:'Canadá',Monaco:'Mônaco',Spain:'Espanha',Austria:'Áustria',UK:'Reino Unido',Belgium:'Bélgica',Hungary:'Hungria',Netherlands:'Países Baixos',Italy:'Itália',Azerbaijan:'Azerbaijão',Malaysia:'Malásia',Singapore:'Singapura',Mexico:'México',Brazil:'Brasil',Qatar:'Catar',UAE:'Emirados Árabes Unidos',Morocco:'Marrocos',Sweden:'Suécia',Germany:'Alemanha',Portugal:'Portugal',Switzerland:'Suíça',India:'Índia',France:'França',Argentina:'Argentina','South Africa':'África do Sul',Turkey:'Turquia','Saudi Arabia':'Arábia Saudita',Russia:'Rússia',Korea:'Coreia do Sul',Bahrain:'Bahrein'} as Record<string,string>)[country] ?? country;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterCircuits(rows: CircuitSummary[], query: string) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return rows.filter(({circuit:c}) => terms.every((term) => normalize(`${c.name} ${c.locality} ${c.country} ${circuitCountry(c.country)}`).includes(term)));
}
export function nextCircuit(rows: CircuitSummary[], now = Date.now()): string | null {
  const upcoming = rows.flatMap((row) => row.calendar.map((race) => ({id:row.circuit.id,date:Date.parse(race.date_utc)})))
    .filter((race) => Number.isFinite(race.date) && race.date > now).sort((a,b) => a.date-b.date);
  return upcoming[0]?.id ?? null;
}
export const currentCircuitRace = (calendar: CircuitCalendar[], season: number) => calendar.find((race) => race.season === season) ?? null;
