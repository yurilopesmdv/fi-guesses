// Cache sob demanda de voltas (Jolpica, 1996+) e stints (OpenF1, 2023+) por GP. Usado pela função race-detail e pela sync-series.
type Db = { from: (t: string) => any };
type Loaders = {
  laps: (season: number, round: number) => Promise<{ laps: number; positions: Record<string, number[]> }>;
  stints: (dateUtc: string, season: number) => Promise<{ driver_code: string; stint: number; compound: string | null; lap_start: number; lap_end: number | null }[]>;
};
const must = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); };

export async function ensureLaps(db: Db, load: Loaders['laps'], season: number, round: number) {
  const meta = await db.from('race_laps_meta').select('laps').eq('season', season).eq('round', round).maybeSingle();
  if (meta.data) return 'cached';
  const { laps, positions } = await load(season, round);
  if (!laps) return 'none';
  const rows = Object.entries(positions).map(([driver_id, p]) => ({ season, round, driver_id, positions: Array.from({ length: laps + 1 }, (_, i) => p[i] ?? null) }));
  must(await db.from('race_lap_positions').upsert(rows, { onConflict: 'season,round,driver_id' }));
  must(await db.from('race_laps_meta').upsert({ season, round, laps }, { onConflict: 'season,round' }));
  return 'stored';
}

/** Até 10 tentativas: a OpenF1 bloqueia acesso sem assinatura durante sessões ao vivo. */
export async function ensureStints(db: Db, load: Loaders['stints'], season: number, round: number, dateUtc: string) {
  if (season < 2023) return 'unsupported';
  const meta = (await db.from('race_stints_meta').select('status,attempts').eq('season', season).eq('round', round).maybeSingle()).data;
  if (meta?.status === 'ok') return 'cached';
  if ((meta?.attempts ?? 0) >= 10) return 'none';
  const mark = (status: 'ok' | 'none') => db.from('race_stints_meta').upsert({ season, round, status, attempts: (meta?.attempts ?? 0) + 1, checked_at: new Date().toISOString() }, { onConflict: 'season,round' });
  try {
    const rows = await load(dateUtc, season);
    if (!rows.length) { await mark('none'); return 'none'; }
    must(await db.from('race_stints').upsert(rows.map((r) => ({ season, round, ...r })), { onConflict: 'season,round,driver_code,stint' }));
    await mark('ok');
    return 'stored';
  } catch { await mark('none'); return 'blocked'; }
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

export function createRaceDetailHandler(db: Db, load: Loaders) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405);
    let body: { season?: unknown; round?: unknown };
    try { body = await req.json(); } catch { return json({ ok: false, error: 'Envie um objeto JSON válido.' }, 400); }
    const { season, round } = body ?? {};
    if (typeof season !== 'number' || !Number.isInteger(season) || season < 1996 || season > new Date().getFullYear()
      || typeof round !== 'number' || !Number.isInteger(round) || round < 1 || round > 30) return json({ ok: false, error: 'GP inválido.' }, 400);
    const race = (await db.from('races').select('date_utc').eq('series', 'f1').eq('season', season).eq('round', round).maybeSingle()).data;
    if (!race || Date.parse(race.date_utc) > Date.now()) return json({ ok: false, error: 'GP ainda não disputado.' }, 404);
    try {
      const [laps, stints] = await Promise.all([ensureLaps(db, load.laps, season, round), ensureStints(db, load.stints, season, round, race.date_utc)]);
      return json({ ok: true, laps, stints });
    } catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502); }
  };
}
