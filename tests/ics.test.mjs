import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIcs } from '../src/lib/ics.ts';

const base = { series: 'f1', season: 2026, round: 21, name: 'GP de São Paulo', circuit: 'Interlagos', country: 'Brazil', fp1_utc: null, fp2_utc: null, fp3_utc: null, sprint_quali_utc: null, sprint_utc: null, quali_utc: '2026-11-07T18:00:00Z', date_utc: '2026-11-08T17:00:00Z', times_tbc: false };
test('ICS usa UID estável por sessão, horários UTC e escapa texto', () => {
  const a = buildIcs([base], '2026-10-30T00:00:00Z'), b = buildIcs([base], '2026-10-31T00:00:00Z');
  const uids = (s) => s.match(/UID:[^\r\n]*/g);
  assert.deepEqual(uids(a), ['UID:f1-2026-21-classificacao@bolao-f1', 'UID:f1-2026-21-corrida@bolao-f1']);
  assert.deepEqual(uids(a), uids(b));
  assert.match(a, /DTSTART:20261108T170000Z\r\nDTEND:20261108T190000Z/);
  assert.match(a, /LOCATION:Interlagos\\, Brazil/);
  assert(a.endsWith('END:VCALENDAR\r\n'));
});
test('horários a confirmar viram evento de dia inteiro sem hora inventada', () => {
  const ics = buildIcs([{ ...base, times_tbc: true, date_utc: '2026-11-08T02:00:00Z' }]);
  assert.match(ics, /DTSTART;VALUE=DATE:20261107/);
  assert.doesNotMatch(ics, /DTSTART:\d/);
});
