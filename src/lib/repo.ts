import { supabase } from './supabase';
import { fetchRaceResult, fetchSeasonBundle } from './f1api';
import type { Answer, ConstructorStanding, DriverProfile, DriverRaceRow, DriverSearchRow, HeadToHead, OpenPool, PoolSummary, Series, Driver, DriverStanding, Pool, Prediction, Question, Race, RaceResult, Result, Standing } from './types';

const throwIf = <T>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

// ---------- perfil ----------
export const getMyProfile = async () => {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  return throwIf(await supabase.from('profiles').select('*').eq('id', uid).single());
};
export const updateMyProfile = async (patch: { name?: string; avatar?: string }) => {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  throwIf(await supabase.from('profiles').update(patch).eq('id', uid));
};

// ---------- bolões ----------
export const listMyPools = async () =>
  throwIf(await supabase.from('pools').select('*').order('created_at')) as Pool[];
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
  if (error) throw new Error(error.message);
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
export const savePrediction = async (questionId: string, answer: Answer) => {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  throwIf(await supabase.from('predictions').upsert({ question_id: questionId, user_id: uid, answer }, { onConflict: 'question_id,user_id' }));
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
