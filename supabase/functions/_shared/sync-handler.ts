type Series = 'f1' | 'f2' | 'f3';
type Sync = (series: Series, season: number) => Promise<unknown>;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const message = (e: unknown) => e instanceof Error ? e.message : String(e);

/** Mantém o preflight barato e só executa sincronização após validar o POST. */
export function createSyncHandler(sync: Sync, settle: (season: number) => Promise<number>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'Use POST para sincronizar.' }, 405);

    let body: { series?: unknown; season?: unknown };
    try {
      body = await req.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return json({ ok: false, error: 'Envie um objeto JSON válido.' }, 400); }

    const series = body.series ?? 'all';
    const season = body.season ?? new Date().getFullYear();
    if (!['all', 'f1', 'f2', 'f3'].includes(String(series)) || typeof series !== 'string'
      || typeof season !== 'number' || !Number.isInteger(season) || season < 1950 || season > new Date().getFullYear()) {
      return json({ ok: false, error: 'Categoria ou temporada inválida.' }, 400);
    }

    const list: Series[] = series === 'all' ? ['f1', 'f2', 'f3'] : [series as Series];
    const out: Record<string, unknown> = {};
    const errors: string[] = [];
    let f1Synced = false;
    for (const s of list) {
      try { out[s] = await sync(s, season); if (s === 'f1') f1Synced = true; }
      catch (e) { out[s] = { error: message(e) }; errors.push(`${s}: ${message(e)}`); }
    }
    if (f1Synced) {
      try { out.settled = await settle(season); }
      catch (e) { errors.push(`apuração: ${message(e)}`); }
    }
    return json({ ok: errors.length === 0, season, ...out, ...(errors.length ? { error: errors.join('; ') } : {}) }, errors.length ? 502 : 200);
  };
}
