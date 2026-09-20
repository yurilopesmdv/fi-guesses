// Sincroniza F1 (Jolpica), F2 e F3 (site/API oficiais) no banco e apura o pódio dos bolões de F1 automaticamente.
// Chamada pelo pg_cron (agendado) e pelo botão "Atualizar" do app. Body: { series?: 'f1'|'f2'|'f3'|'all', season?: number }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { fetchHeadshots, fetchSeasonBundle } from '../_shared/f1api.ts';
import { fetchF2F3Bundle } from '../_shared/f2f3.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const up = async (table: string, rows: any[], onConflict: string) => {
  const keys = onConflict.split(',');
  rows = [...new Map(rows.map((r) => [keys.map((k) => r[k]).join('|'), r])).values()]; // dedupe pela chave
  if (!rows.length) return;
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
};

async function syncOne(series: 'f1' | 'f2' | 'f3', season: number) {
  const b = series === 'f1' ? await fetchSeasonBundle(season) : await fetchF2F3Bundle(series, season);
  await up('races', b.races, 'series,season,round');
  await up('drivers', b.drivers, 'series,season,code');
  await up('driver_standings', b.driver_standings, 'series,season,driver_code');
  await up('constructor_standings', b.constructor_standings, 'series,season,team');
  await up('race_results', b.race_results, 'series,season,round,session,position,driver_code');
  await up('f1_sync', [{ series, season, last_round_with_results: b.last_round_with_results, synced_at: new Date().toISOString() }], 'series,season');
  if (series === 'f1' && season === new Date().getFullYear()) {
    const photos = await fetchHeadshots().catch(() => ({}));
    for (const [code, url] of Object.entries(photos)) await db.from('drivers').update({ headshot_url: url }).match({ series: 'f1', season, code });
  }
  return { races: b.races.length, results: b.race_results.length, last_round: b.last_round_with_results };
}

/** Pódio oficial → resultado da pergunta "podium" em todos os bolões que ainda não apuraram. */
async function autoSettle(season: number) {
  const { data } = await db.rpc('auto_settle_podiums', { p_season: season });
  return data ?? 0;
}

Deno.serve(async (req) => {
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const season = Number(body.season ?? new Date().getFullYear());
    const list: ('f1' | 'f2' | 'f3')[] = body.series && body.series !== 'all' ? [body.series] : ['f1', 'f2', 'f3'];
    const out: Record<string, unknown> = {};
    for (const s of list) {
      try { out[s] = await syncOne(s, season); } catch (e) { out[s] = { error: String((e as Error).message) }; }
    }
    if (list.includes('f1')) out.settled = await autoSettle(season);
    return Response.json({ ok: true, season, ...out });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
});
