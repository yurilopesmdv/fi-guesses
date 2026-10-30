import type {FollowKind,MyFollowsOverview,MyLastGpSummary,MyProfileOverview,Profile} from './types';
import { supabase } from './supabase';
import { gridFromResults, resolveGridDrivers } from './raceGrid';
import { fetchPublishedGrid, fetchRaceQualifying, fetchRaceResult, fetchSeasonBundle } from './f1api';
import type { Answer, ConstructorStanding, DriverProfile, DriverRaceRow, DriverSearchRow, GlobalStanding, HeadToHead, OpenPool, PoolLifecycle, TeamHeadToHead, TeamProfile, TeamSearchRow, PoolSummary, Series, Driver, DriverStanding, Pool, Prediction, Question, Race, RaceResult, Result, Standing } from './types';

const throwIf = <T>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

// ---------- perfil ----------
export const getMyProfile = async () => {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  return throwIf(await supabase.from('profiles').select('*').eq('id', uid).single()) as Profile;
};
export const getMyProfileOverview = async () => throwIf(await supabase.rpc('my_profile_overview')) as MyProfileOverview|null;
export const updateMyProfile = async (patch: { name?: string; avatar?: string }, expectedUserId?:string) => {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if(!uid||(expectedUserId&&uid!==expectedUserId))throw Error('Sua sessão mudou. Abra o perfil novamente.');
  throwIf(await supabase.from('profiles').update(patch).eq('id', uid));
};

// ---------- acompanhamentos (privados) ----------
export const getMyFollowsOverview = async () => throwIf(await supabase.rpc('my_follows_overview')) as MyFollowsOverview|null;
export const getMyLastGpSummary = async () => throwIf(await supabase.rpc('my_last_gp_summary')) as MyLastGpSummary|null;
export const isFollowing = async (kind: FollowKind, entityId: string) =>
  (throwIf(await supabase.from('follows').select('entity_id').eq('kind', kind).eq('entity_id', entityId).limit(1)) as unknown[]).length > 0;
export const follow = async (kind: FollowKind, entityId: string) =>
  throwIf(await supabase.from('follows').upsert({ kind, entity_id: entityId }, { onConflict: 'user_id,kind,entity_id', ignoreDuplicates: true }));
export const unfollow = async (kind: FollowKind, entityId: string) =>
  throwIf(await supabase.from('follows').delete().eq('kind', kind).eq('entity_id', entityId));
/** Identidade estável da equipe a partir do nome exibido na rota. */
export const getTeamConstructorId = async (team: string) =>
  ((throwIf(await supabase.from('drivers').select('constructor_id').eq('series', 'f1').eq('team', team).not('constructor_id', 'is', null).order('season', { ascending: false }).limit(1)) as { constructor_id: string }[])[0]?.constructor_id
  ?? (throwIf(await supabase.from('race_results').select('constructor_id').eq('series', 'f1').eq('team', team).not('constructor_id', 'is', null).order('season', { ascending: false }).limit(1)) as { constructor_id: string }[])[0]?.constructor_id) ?? null;

// ---------- bolões ----------
export const listMyPools = async () =>
  throwIf(await supabase.from('pools').select('*').order('created_at', { ascending: false })) as Pool[];
export const listPoolLifecycles = async (ids?: string[]) =>
  throwIf(await supabase.rpc('pool_lifecycles', { p_pool_ids: ids ?? null })) as PoolLifecycle[];
export const getPool = async (id: string) =>
  throwIf(await supabase.from('pools').select('*').eq('id', id).single()) as Pool;
export const createPool = async (name: string, season: number, stake_label?: string, race_id?: string) =>
  throwIf(await supabase.rpc('create_pool', { p_name: name, p_season: season, p_stake_label: stake_label ?? null, p_race_id: race_id ?? null })) as string;
export const listOpenPools = async () => throwIf(await supabase.rpc('list_open_pools')) as OpenPool[];
export const joinPoolById = async (id: string) => throwIf(await supabase.rpc('join_pool_by_id', { p_pool: id })) as string;
export const myPoolsSummary = async () =>
  throwIf(await supabase.rpc('my_pools_summary')) as PoolSummary[];
export const joinPool = async (code: string) =>
  throwIf(await supabase.rpc('join_pool', { p_code: code })) as string;
export const updatePool = async (id: string, patch: Partial<Pool>) =>
  throwIf(await supabase.from('pools').update(patch).eq('id', id));
/** .single() também rejeita exclusão sem linha afetada (RLS / bolão inexistente). */
export const deletePool = async (id: string) =>
  throwIf(await supabase.from('pools').delete().eq('id', id).select('id').single());

export const listGlobalStandings = async () =>
  throwIf(await supabase.rpc('global_standings')) as GlobalStanding[];

export const listStandings = async (poolId: string) =>
  throwIf(await supabase.from('pool_standings').select('*').eq('pool_id', poolId).order('total', { ascending: false })) as Standing[];
export const listRaceScores = async (poolId: string) =>
  throwIf(await supabase.from('race_scores').select('*').eq('pool_id', poolId)) as { race_id: string; user_id: string; points: number }[];
export const raceParticipation = async (poolId: string, raceId: string) =>
  throwIf(await supabase.rpc('race_participation', { p_pool: poolId, p_race: raceId })) as { user_id: string; has_prediction: boolean }[];

// ---------- calendário / pilotos ----------
export const getRace = async (id: string) => throwIf(await supabase.from('races').select('*').eq('id', id).single()) as Race;
export const listRaces = async (season: number, series: Series = 'f1') =>
  throwIf(await supabase.from('races').select('*').eq('series', series).eq('season', season).order('round')) as Race[];
export const listDrivers = async (season: number, series: Series = 'f1') =>
  throwIf(await supabase.from('drivers').select('*').eq('series', series).eq('season', season).order('team')) as Driver[];

/** Importa/atualiza calendário, pilotos, resultados e classificações da temporada (idempotente). */
export const importSeason = async (season: number) => {
  const b = await fetchSeasonBundle(season);
  throwIf(await supabase.from('races').upsert(b.races, { onConflict: 'series,season,round' }));
  throwIf(await supabase.from('drivers').upsert(b.drivers, { onConflict: 'series,season,code' }));
  throwIf(await supabase.from('driver_standings').upsert(b.driver_standings, { onConflict: 'series,season,driver_code' }));
  throwIf(await supabase.from('constructor_standings').upsert(b.constructor_standings, { onConflict: 'series,season,team' }));
  if (b.race_results.length) throwIf(await supabase.from('race_results').upsert(b.race_results, { onConflict: 'series,season,round,session,position,driver_code' }));
  throwIf(await supabase.from('f1_sync').upsert({ series: 'f1', season, last_round_with_results: b.last_round_with_results, synced_at: new Date().toISOString() }, { onConflict: 'series,season' }));
  return b;
};

/** Sincroniza no servidor (Edge Function): F1/F2/F3 da temporada atual + apuração automática dos bolões. */
export const syncSeries = async (series: Series | 'all' = 'all') => {
  const { data, error } = await supabase.functions.invoke('sync-series', { body: { series } });
  if (error) {
    const details = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
    throw new Error(details?.error ?? error.message);
  }
  if (!data?.ok || data[series]?.error) throw new Error(data?.error ?? data?.[series]?.error ?? 'A sincronização não foi concluída.');
  return data as { ok: boolean; settled?: number };
};
export const getSyncInfo = async (season: number, series: Series = 'f1') =>
  (await supabase.from('f1_sync').select('*').eq('series', series).eq('season', season).maybeSingle()).data as { last_round_with_results: number | null; synced_at: string } | null;
export const listDriverStandings = async (season: number, series: Series = 'f1') =>
  throwIf(await supabase.from('driver_standings').select('*').eq('series', series).eq('season', season).order('position')) as DriverStanding[];
export const listConstructorStandings = async (season: number, series: Series = 'f1') =>
  throwIf(await supabase.from('constructor_standings').select('*').eq('series', series).eq('season', season).order('position')) as ConstructorStanding[];
export const listRaceResults = async (season: number, round: number, series: Series = 'f1') =>
  throwIf(await supabase.from('race_results').select('*').eq('series', series).eq('season', season).eq('round', round).order('session').order('position')) as RaceResult[];
/** Etapas de F2/F3 no mesmo fim de semana de um GP de F1 (mesmo país, ±3 dias). */
export const listSupportRaces = async (race: Race) => {
  const from = new Date(new Date(race.date_utc).getTime() - 3 * 86400000).toISOString(), to = new Date(new Date(race.date_utc).getTime() + 3 * 86400000).toISOString();
  return throwIf(await supabase.from('races').select('*').in('series', ['f2', 'f3']).eq('season', race.season).gte('date_utc', from).lte('date_utc', to)) as Race[];
};

// ---------- perguntas / palpites / resultados ----------
export const listQuestions = async (poolId: string, raceId: string) =>
  throwIf(await supabase.from('questions').select('*').eq('pool_id', poolId).eq('race_id', raceId).order('position').order('created_at')) as Question[];
export const addQuestion = async (q: Omit<Question, 'id'>) =>
  throwIf(await supabase.from('questions').insert(q));
export const deleteQuestion = async (id: string) =>
  throwIf(await supabase.from('questions').delete().eq('id', id));

export const listPredictions = async (questionIds: string[]) =>
  questionIds.length ? (throwIf(await supabase.from('predictions').select('*').in('question_id', questionIds)) as Prediction[]) : [];
export const savePrediction = async (questionId: string, answer: Answer, expectedUserId?: string) => {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid || (expectedUserId && uid !== expectedUserId)) throw Object.assign(new Error('Sessão alterada. Entre novamente para enviar.'), {status:401});
  const response = await supabase.from('predictions').upsert({ question_id: questionId, user_id: uid, answer }, { onConflict: 'question_id,user_id' });
  if (response.error) throw response.error;
};

export const listResults = async (questionIds: string[]) =>
  questionIds.length ? (throwIf(await supabase.from('results').select('*').in('question_id', questionIds)) as Result[]) : [];
export const saveResult = async (questionId: string, answer: Answer) => {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  throwIf(await supabase.from('results').upsert({ question_id: questionId, answer, set_by: uid }));
};

/** Busca o pódio oficial na API; null se a corrida ainda não foi apurada. */
export const fetchOfficialPodium = async (race: Race) => {
  const pos = await fetchRaceResult(race.season, race.round);
  if (!pos || !pos[1]) return null;
  return { p1: pos[1], p2: pos[2], p3: pos[3], positions: pos };
};

// ---------- piloto ----------
export const getDriverProfile = async (driverId: string) =>
  throwIf(await supabase.rpc('driver_profile', { p_driver_id: driverId })) as DriverProfile;
export const listDriverSeasonRaces = async (driverId: string, season: number) =>
  throwIf(await supabase.rpc('driver_season_races', { p_driver_id: driverId, p_season: season })) as DriverRaceRow[];
export const searchDrivers = async (q: string) =>
  throwIf(await supabase.rpc('driver_search', { p_q: q })) as DriverSearchRow[];
export const headToHead = async (a: string, b: string) =>
  throwIf(await supabase.rpc('driver_head_to_head', { p_a: a, p_b: b })) as HeadToHead[];

export type DriverCircuitPoint={id:string;name:string;country:string;latitude:number|null;longitude:number|null;wins:number;podiums:number;results:{season:number;round:number;race_name:string;position:number}[]};
export const getDriverCircuitMap = async (driverId: string) => throwIf(await supabase.rpc('driver_circuit_map', { p_driver_id: driverId })) as DriverCircuitPoint[];

export const getCircuitRaceInsight = async (raceId: string) => throwIf(await supabase.rpc('circuit_race_insight', { p_race: raceId })) as import('./types').CircuitRaceInsight | null;

export type CareerStint={team:string;color:string|null;from:number;to:number;races:number;wins:number;podiums:number;points:number};
export type CareerStreak={best:number;from:number;to:number};
export type DriverCareerShape={stints:CareerStint[];streaks:Partial<Record<'wins'|'podiums'|'points',CareerStreak>>};
export const getDriverCareerShape = async (driverId: string) => throwIf(await supabase.rpc('driver_career_shape', { p_driver_id: driverId })) as DriverCareerShape | null;

export const listCircuitNames = async () => throwIf(await supabase.from('circuits').select('id,name,country,locality').order('name')) as { id: string; name: string; country: string; locality: string }[];
export type CircuitOverlap={common:{driver_id:string;name:string;a:number;b:number}[];only_a:number;only_b:number};
export const getCircuitWinnersOverlap = async (a: string, b: string) => throwIf(await supabase.rpc('circuit_winners_overlap', { p_a: a, p_b: b })) as CircuitOverlap | null;

export type RivalryCircuits={races:number;a:number;b:number;circuits:{circuit_id:string;name:string;country:string;races:number;a:number;b:number}[]};
export const getDriverRivalryCircuits = async (a: string, b: string) => throwIf(await supabase.rpc('driver_rivalry_circuits', { p_a: a, p_b: b })) as RivalryCircuits | null;

export type FeatKind='win_from_back'|'pole_no_points'|'first_win'|'win_on_debut'|'longest_wait'|'one_two';
export type FeatRow={season:number;round:number;race_name:string;date_utc:string;driver_id:string;name:string|null;team:string|null;grid:number|null;position:number;extra:number|null};
export const getHistoryFeats = async (kind: FeatKind, from: number, to: number) => throwIf(await supabase.rpc('history_feats', { p_kind: kind, p_from: from, p_to: to })) as { total: number; rows: FeatRow[] } | null;

export type SeasonOverview={season:number;finished:boolean;races:number;completed:number;from_p1:number;
 driver_champion:{driver_id:string;name:string;team:string|null;points:number;wins:number}|null;constructor_champion:{team:string;points:number;wins:number;color:string|null}|null;
 leader:{driver_id:string;name:string;points:number}|null;winners:{driver_id:string;name:string|null;team_color:string|null;wins:number}[];teams:{team:string;wins:number}[];
 stops:{race_id:string;round:number;name:string;country:string|null;date_utc:string;circuit_id:string|null;circuit:string|null;lat:number|null;lon:number|null;winner:string|null}[]};
export const getSeasonOverview = async (season: number) => throwIf(await supabase.rpc('season_overview', { p_season: season })) as SeasonOverview | null;

export type FirstStarts={starts:number;wins:number;podiums:number;points:number;p1_starts:number;until:number};
export const getDriverFirstStarts = async (a: string, b: string, n: number) => throwIf(await supabase.rpc('driver_first_starts', { p_a: a, p_b: b, p_n: n })) as Record<string, FirstStarts> | null;

export type OnThisDay={id:string;season:number;round:number;name:string;country:string|null;date_utc:string;dist:number;winner:{driver_id:string;name:string;team:string|null}};
export const getF1OnThisDay = async (month: number, day: number) => throwIf(await supabase.rpc('f1_on_this_day', { p_month: month, p_day: day })) as OnThisDay[];

export type RecordKind='wins'|'podiums'|'starts'|'p1';
export type RecordsUntil=Partial<Record<RecordKind,{driver_id:string;name:string|null;value:number;rank:number}[]>>;
export const getRecordsUntil = async (season: number) => throwIf(await supabase.rpc('records_until', { p_season: season })) as RecordsUntil | null;

// ---------- equipe ----------
export const getTeamProfile = async (team: string) => throwIf(await supabase.rpc('team_profile', { p_team: team })) as TeamProfile;
export const searchTeams = async (q: string) => throwIf(await supabase.rpc('team_search', { p_q: q })) as TeamSearchRow[];
export const teamHeadToHead = async (a: string, b: string) => throwIf(await supabase.rpc('team_head_to_head', { p_a: a, p_b: b })) as TeamHeadToHead[];

// Cache curto para consultas públicas de grid; não persiste sessão nem credenciais.
const gridCache = new Map<string, { expires: number; value: import('./types').StartingGrid }>();
export async function getStartingGrid(race: Race, drivers: Driver[], results: RaceResult[], refresh = false): Promise<import('./types').StartingGrid | null> {
  if (race.series !== 'f1') return null;
  const stored = gridFromResults(results, drivers);
  if (stored) return stored;
  // Horários antigos podem não conter a sessão de classificação. Não bloquear o histórico.
  if (race.quali_utc && Date.now() < Date.parse(race.quali_utc)) return null;
  if (!race.quali_utc && Date.now() < Date.parse(race.date_utc) - 2 * 86400000) return null;
  const key = `${race.series}:${race.season}:${race.round}`;
  const cached = gridCache.get(key);
  if (!refresh && cached && cached.expires > Date.now()) return resolveGridDrivers(cached.value, drivers);
  if (race.season < 2023) return null;
  const rows = await fetchPublishedGrid(race.date_utc, race.season);
  if (!rows.length) return null;
  const value = { source: 'openf1' as const, rows };
  gridCache.set(key, { expires: Date.now() + 120000, value });
  return resolveGridDrivers(value, drivers);
}

const qualifyingCache = new Map<string, { expires: number; value: import('./types').QualifyingOrder }>();
/** A qualy é referência separada: nunca substitui a largada nem o resultado final. */
export async function getQualifyingOrder(race: Race, drivers: Driver[], refresh = false): Promise<import('./types').QualifyingOrder | null> {
  if (race.series !== 'f1') return null;
  if (race.quali_utc && Date.now() < Date.parse(race.quali_utc)) return null;
  if (!race.quali_utc && Date.now() < Date.parse(race.date_utc) - 2 * 86400000) return null;
  const key = `${race.series}:${race.season}:${race.round}`;
  const cached = qualifyingCache.get(key);
  if (!refresh && cached && cached.expires > Date.now()) return resolveGridDrivers(cached.value, drivers);
  const rows = await fetchRaceQualifying(race.season, race.round);
  if (!rows.length) return null;
  const value = { source: 'qualifying' as const, rows };
  qualifyingCache.set(key, { expires: Date.now() + 120000, value });
  return resolveGridDrivers(value, drivers);
}


// ---------- catálogo de pistas ----------
export const listCircuits = async (season: number) =>
  throwIf(await supabase.rpc('circuit_catalog', { p_season: season })) as import('./types').CircuitSummary[];
export const listCircuitArchive = async (season: number) =>
  throwIf(await supabase.rpc('circuit_archive', { p_current_season: season })) as import('./types').CircuitSummary[];
export const getCircuitProfile = async (id: string) =>
  throwIf(await supabase.rpc('circuit_profile', { p_id: id })) as import('./types').CircuitProfile | null;
export const circuitMediaUrl = (path: string) => path.startsWith('https://')
  ? path : supabase.storage.from('circuits').getPublicUrl(path).data.publicUrl;
/** Resolve também corridas importadas antes da introdução de circuit_id. */
export const findRaceCircuit = async (race: Race) => {
  if (race.series !== 'f1') return null;
  if (race.circuit_id) {
    const circuit = throwIf(await supabase.from('circuits').select('id').eq('id',race.circuit_id).maybeSingle()) as { id: string } | null;
    return circuit?.id ?? null;
  }
  return (throwIf(await supabase.from('circuit_seasons').select('circuit_id').eq('season',race.season).eq('round',race.round).maybeSingle()) as { circuit_id: string } | null)?.circuit_id ?? null;
};

export async function listContentPosts(kind: 'news' | 'curiosity' | null, offset = 0) {
  let query = supabase.from('content_posts').select('id,kind,title,summary,url,source_name,author,circuit_id,published_at')
    .eq('published', true).lte('published_at', new Date().toISOString());
  if (kind) query = query.eq('kind', kind);
  return throwIf(await query.order('published_at', {ascending:false}).order('id', {ascending:false}).range(offset, offset + 19)) as import('./types').ContentPost[];
}
export const getContentSources = async () => throwIf(await supabase.from('content_sources').select('id,name,checked_at,succeeded_at,last_error').eq('enabled', true).order('name')) as import('./types').ContentSourceStatus[];

export const getPoolAnalysis=async(poolId:string)=>throwIf(await supabase.rpc('pool_analysis',{p_pool:poolId})) as import('./poolInsights').PoolAnalysis|null;
export const listResultHistory=async(poolId:string,raceId:string)=>throwIf(await supabase.from('result_history').select('id,question_id,question_prompt,previous_answer,answer,actor_id,changed_at').eq('pool_id',poolId).eq('race_id',raceId).order('changed_at',{ascending:false}).limit(100)) as {id:string;question_id:string|null;question_prompt:string;previous_answer:Answer|null;answer:Answer;actor_id:string|null;changed_at:string}[];
export type DriverContextRow={name:string;date_utc:string;season:number;round:number;circuit_id:string|null;position:number;grid:number|null;status:string};
export const getDriverRaceContext=async(driverId:string,race:Race)=>throwIf(await supabase.rpc('driver_race_context',{p_driver:driverId,p_season:race.season,p_before:race.date_utc,p_circuit:race.circuit_id??null})) as {recent:DriverContextRow[];circuit:DriverContextRow[]}|null;
export const listCircuitNews=async(circuitId:string)=>throwIf(await supabase.from('content_posts').select('id,title,url,published_at').eq('kind','news').eq('published',true).eq('circuit_id',circuitId).order('published_at',{ascending:false}).limit(3)) as {id:string;title:string;url:string;published_at:string}[];
