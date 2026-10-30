export type Series = 'f1' | 'f2' | 'f3';
export const SERIES_LABEL: Record<Series, string> = { f1: 'F1', f2: 'F2', f3: 'F3' };

export type QuestionKind = 'podium' | 'driver' | 'position_of_driver' | 'yesno' | 'text';

export type Profile = { id: string; name: string; avatar: string };

export type Pool = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  season: number;
  stake_label: string | null;
  lock_minutes_before: number;
  race_id: string | null;
  created_at: string;
};

export type Race = {
  id: string;
  series: Series;
  season: number;
  round: number;
  name: string;
  circuit: string | null;
  circuit_id?: string | null;
  country: string | null;
  date_utc: string;
  has_sprint: boolean;
  fp1_utc: string | null;
  fp2_utc: string | null;
  fp3_utc: string | null;
  sprint_quali_utc: string | null;
  sprint_utc: string | null;
  quali_utc: string | null;
  times_tbc: boolean;
};

export type Driver = {
  series: Series;
  season: number;
  code: string;
  driver_id: string | null;
  name: string;
  number: number | null;
  team: string | null;
  team_color: string | null;
};

export type Question = {
  id: string;
  pool_id: string;
  race_id: string;
  kind: QuestionKind;
  prompt: string;
  points: number;
  near_points: number;
  position: number;
  session?: 'race' | 'qualifying' | 'sprint';
};

export type PodiumAnswer = { p1?: string; p2?: string; p3?: string };
export type Answer =
  | PodiumAnswer
  | { driver: string }
  | { pos: number }
  | { v: boolean }
  | { t: string }
  | { correct_users: string[] };

export type Prediction = { id: string; question_id: string; user_id: string; answer: Answer };
export type Result = { question_id: string; answer: Answer };

export type Standing = {
  pool_id: string;
  user_id: string;
  name: string;
  avatar: string;
  total: number;
  races_scored: number;
};

export type GlobalStanding = {
  user_id: string;
  name: string;
  avatar: string;
  total: number;
  pools_played: number;
  races_scored: number;
  rank: number;
};

export type DriverStanding = { series: Series; season: number; position: number; driver_code: string; team: string | null; points: number; wins: number };
export type ConstructorStanding = { series: Series; season: number; position: number; team: string; team_color: string | null; points: number; wins: number };
export type RaceResult = { series: Series; session: 'race' | 'sprint' | 'feature'; season: number; round: number; position: number; driver_code: string; team: string | null; grid: number | null; points: number; status: string; fastest_lap: boolean };

export type PoolSummary = { pool_id: string; members: number; next_race_name: string | null; next_race_date: string | null; my_total: number; my_rank: number };

export type OpenPool = { id: string; name: string; season: number; race_id: string | null; race_name: string | null; stake_label: string | null; owner_name: string; members: number; next_race_date: string | null; is_member: boolean };

export type PoolLifecycle = {
  pool_id: string;
  status: 'ongoing' | 'finished';
  pending_results: number;
  has_future_races: boolean;
  has_races: boolean;
  created_at: string;
  last_race_date: string | null;
};

export type DriverSeasonStat = { season: number; team: string | null; position: number | null; champ_points: number | null; races: number; wins: number; podiums: number; poles: number; fastest_laps: number; dnfs: number; best: number | null; avg_finish: number | null; avg_grid: number | null; champion: boolean };
export type DriverTeamStat = { team: string; first_season: number; last_season: number; seasons: number; races: number; wins: number; podiums: number; poles: number; points: number; dnfs: number; team_color: string | null; titles: number };
export type DriverProfile = {
  driver: { driver_id: string; name: string; code: string; number: number | null; team: string | null; team_color: string | null; season: number; headshot_url: string | null };
  career: { first_season: number; last_season: number; seasons: number; races: number; wins: number; podiums: number; poles: number; fastest_laps: number; dnfs: number; points: number; best_finish: number | null; avg_finish: number | null; titles: number };
  ranks: { wins_rank: number; podiums_rank: number; titles_rank: number; points_rank: number; poles_rank: number; races_rank: number; total_drivers: number };
  teams: string | null;
  by_team: DriverTeamStat[];
  seasons: DriverSeasonStat[];
};
export type DriverRaceRow = { round: number; race_name: string; country: string | null; date_utc: string; grid: number | null; finish: number; points: number; status: string; fastest_lap: boolean; classified: boolean; team: string | null };
export type DriverSearchRow = { driver_id: string; name: string; first_season: number; last_season: number; wins: number; titles: number; team: string | null; team_color: string | null };
export type HeadToHead = { season: number; team: string; races: number; a_ahead: number; b_ahead: number; a_points: number; b_points: number };

export type TeamSeasonStat = { season: number; position: number | null; champ_points: number | null; races: number; wins: number; podiums: number; poles: number; dnfs: number; champion: boolean; drivers: string | null };
export type TeamBestDriver = { driver_id: string; name: string; first_season: number; last_season: number; races: number; wins: number; podiums: number; poles: number; points: number; titles: number; headshot_url: string | null };
export type TeamProfile = {
  team: { name: string; color: string | null; drivers: { driver_id: string; name: string; code: string; number: number | null; headshot_url: string | null }[] | null };
  career: { first_season: number; last_season: number; seasons: number; races: number; entries: number; wins: number; podiums: number; poles: number; fastest_laps: number; dnfs: number; points: number; one_twos: number; titles: number; driver_titles: number };
  ranks: { wins_rank: number; podiums_rank: number; titles_rank: number; points_rank: number; poles_rank: number; races_rank: number; total_teams: number };
  seasons: TeamSeasonStat[];
  best_drivers: TeamBestDriver[];
};
export type TeamSearchRow = { team: string; first_season: number; last_season: number; wins: number; titles: number; team_color: string | null };
export type TeamHeadToHead = { season: number; a_position: number | null; b_position: number | null; a_points: number; b_points: number; a_wins: number; b_wins: number };

/** Zero representa boxes/sem posição de grid informada pela fonte. */
export type StartingGridRow = { position: number | null; driver_id?: string; driver_code: string; name: string; team: string | null; team_color?: string };
export type StartingGrid = { source: 'results' | 'openf1'; rows: StartingGridRow[] };

export type QualifyingOrder = { source: 'qualifying'; rows: StartingGridRow[] };


export type Circuit = { id: string; name: string; locality: string; country: string; description: string; official_url: string; updated_at: string };
export type CircuitMedia = { id: string; circuit_id: string; kind: 'photo' | 'map'; section_title?: string | null; section_turns?: string | null; section_description?: string | null; storage_path: string; thumbnail_path: string; caption: string; author: string; license: string; license_url: string; source_url: string; width: number; height: number; period: string | null; layout_season: number | null };
export type CircuitLayout = { circuit_id: string; season: number; length_m: number; turns: number; direction: 'clockwise' | 'anticlockwise' | 'figure_eight'; source_url: string; gp_laps: number | null; gp_distance_km: number | null; lap_record_time: string | null; lap_record_driver: string | null; lap_record_year: number | null; notes: string };
export type CircuitStats = { first_season: number | null; last_season: number | null; seasons: number; races: number; different_winners: number; record_wins: number; complete: boolean; synced_at: string | null };
export type CircuitCalendar = { circuit_id: string; season: number; round: number; race_name: string; date_utc: string };
export type CircuitLastRace = { season: number; round: number; race_name: string; date_utc: string; race_id: string | null; winners: { driver_id: string; driver_name: string; team: string | null; has_profile: boolean }[] };
export type CircuitSummary = { circuit: Circuit; layout: CircuitLayout | null; stats: CircuitStats; last_race: CircuitLastRace | null; cover: CircuitMedia | null; map: CircuitMedia | null; calendar: CircuitCalendar[] };
export type CircuitProfile = Omit<CircuitSummary, 'cover' | 'map'> & { media: CircuitMedia[]; winners: { driver_id: string; driver_name: string; wins: number; rank: number; has_profile: boolean }[] };

export type ContentPost = { id: string; kind: 'news' | 'curiosity'; title: string; summary: string; url: string; source_name: string; author: string | null; circuit_id: string | null; published_at: string };
export type ContentSourceStatus = { id: string; name: string; checked_at: string | null; succeeded_at: string | null; last_error: string | null };

export type ProfilePoolSummary = {
 id:string;name:string;season:number;created_at:string;status:'ongoing'|'finished';total:number;rank:number;members:number;
 scored_questions:number;max_points:number;earned_points:number;exact_podiums:number;eligible_questions:number;answered_questions:number;
};
export type MyProfileOverview = {
 profile:Profile;global:{rank:number;total:number;pools_played:number}|null;pools:ProfilePoolSummary[];generated_at:string;
};

export type FollowKind='driver'|'team'|'circuit';
export type FollowRaceRef={race_id:string;season:number;round:number;name:string;country?:string|null;date_utc:string};
export type FollowStanding={season:number;position:number;points:number;wins:number};
export type FollowedDriver={driver_id:string;name:string;code:string;number:number|null;team:string|null;team_color:string|null;headshot_url:string|null;active:boolean;
 standing:FollowStanding|null;last_race:(FollowRaceRef&{grid:number|null;position:number;points:number;status:string|null;team:string|null})|null};
export type FollowedTeam={constructor_id:string;team:string;team_color:string;active:boolean;standing:FollowStanding|null;
 last_race:(FollowRaceRef&{drivers:{code:string;name:string|null;driver_id:string|null;grid:number|null;position:number;points:number;status:string|null}[]})|null};
export type FollowedCircuit={circuit_id:string;name:string;locality:string;country:string;next_race:FollowRaceRef|null;
 last_winner:{season:number;name:string;date_utc:string;driver_id:string;driver_name:string;team:string|null}|null};
export type MyFollowsOverview={season:number;next_race:{id:string;name:string;country:string|null;circuit_id:string|null;date_utc:string;round:number;season:number}|null;
 drivers:FollowedDriver[];teams:FollowedTeam[];circuits:FollowedCircuit[];synced_at:string|null;generated_at:string};
