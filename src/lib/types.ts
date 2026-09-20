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
};

export type Race = {
  id: string;
  series: Series;
  season: number;
  round: number;
  name: string;
  circuit: string | null;
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

export type DriverStanding = { series: Series; season: number; position: number; driver_code: string; team: string | null; points: number; wins: number };
export type ConstructorStanding = { series: Series; season: number; position: number; team: string; team_color: string | null; points: number; wins: number };
export type RaceResult = { series: Series; session: 'race' | 'sprint' | 'feature'; season: number; round: number; position: number; driver_code: string; team: string | null; grid: number | null; points: number; status: string; fastest_lap: boolean };

export type PoolSummary = { pool_id: string; members: number; next_race_name: string | null; next_race_date: string | null; my_total: number; my_rank: number };

export type OpenPool = { id: string; name: string; season: number; race_id: string | null; race_name: string | null; stake_label: string | null; owner_name: string; members: number; next_race_date: string | null; is_member: boolean };
