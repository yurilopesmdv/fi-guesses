-- Enriquecimento H23: nascimento e nacionalidade da Jolpica, por driver_id. Escrita só pelo backend (sync/script).
create table public.driver_bio (
  driver_id text primary key,
  date_of_birth date,
  nationality text,
  updated_at timestamptz not null default now()
);
alter table public.driver_bio enable row level security;
create policy "driver_bio: read" on public.driver_bio for select to authenticated using (true);
revoke all on public.driver_bio from anon;
revoke insert, update, delete on public.driver_bio from authenticated;
grant select on public.driver_bio to authenticated;

-- Marcos da carreira por idade (datas pelo dia do GP).
create function public.driver_age_milestones(p_driver_id text) returns jsonb
language sql stable security invoker set search_path = public as $$
 select jsonb_build_object('date_of_birth', b.date_of_birth, 'nationality', b.nationality,
  'debut', (select min(date_utc) from driver_results where driver_id = p_driver_id),
  'first_win', (select min(date_utc) from driver_results where driver_id = p_driver_id and position = 1),
  'last_win', (select max(date_utc) from driver_results where driver_id = p_driver_id and position = 1),
  'last_race', (select max(date_utc) from driver_results where driver_id = p_driver_id))
 from driver_bio b where b.driver_id = p_driver_id and auth.uid() is not null;
$$;
revoke all on function public.driver_age_milestones(text) from public, anon;
grant execute on function public.driver_age_milestones(text) to authenticated;

-- Vencedores mais jovens/mais velhos por idade no dia do GP (extra = idade em dias). Mantém os demais tipos de 0040.
create or replace function public.history_feats(p_kind text, p_from int default 1950, p_to int default 2100) returns jsonb
language sql stable security invoker set search_path = public as $$
 with base as (
  select dr.*, row_number() over (partition by dr.driver_id order by dr.date_utc, dr.round) as start_no
  from driver_results dr
 ), picked as (
  select season, round, race_name, date_utc, driver_id, team, grid, position, null::int as extra from base
   where p_kind = 'win_from_back' and position = 1 and grid >= 10
  union all
  select season, round, race_name, date_utc, driver_id, team, grid, position, null from base
   where p_kind = 'pole_no_points' and grid = 1 and points = 0
  union all
  select season, round, race_name, date_utc, driver_id, team, grid, position, start_no::int from (
   select distinct on (driver_id) * from base where position = 1 order by driver_id, date_utc, round) f
   where p_kind in ('first_win', 'win_on_debut', 'longest_wait') and (p_kind <> 'win_on_debut' or start_no = 1)
  union all
  select a.season, a.round, a.race_name, a.date_utc, a.driver_id, a.team, a.grid, a.position, null from base a
   where p_kind = 'one_two' and a.position = 1
     and exists (select 1 from base b where b.season = a.season and b.round = a.round and b.position = 2 and b.team = a.team)
  union all
  select a.season, a.round, a.race_name, a.date_utc, a.driver_id, a.team, a.grid, a.position, ((a.date_utc at time zone 'UTC')::date - b.date_of_birth)::int
   from base a join driver_bio b on b.driver_id = a.driver_id
   where p_kind in ('youngest_winner', 'oldest_winner') and a.position = 1 and b.date_of_birth is not null
 ), scoped as (select * from picked where season between p_from and p_to)
 select jsonb_build_object(
  'total', (select count(*) from scoped),
  'rows', coalesce((select jsonb_agg(jsonb_build_object('season', s.season, 'round', s.round, 'race_name', s.race_name, 'date_utc', s.date_utc,
      'driver_id', s.driver_id, 'team', s.team, 'grid', s.grid, 'position', s.position, 'extra', s.extra,
      'name', (select d.name from drivers d where d.series = 'f1' and d.driver_id = s.driver_id order by d.season desc limit 1)))
    from (select * from scoped order by
      case when p_kind = 'win_from_back' then grid end desc nulls last,
      case when p_kind in ('longest_wait', 'oldest_winner') then extra end desc nulls last,
      case when p_kind = 'youngest_winner' then extra end asc nulls last,
      date_utc desc limit 100) s), '[]')
 ) where auth.uid() is not null and p_kind in ('win_from_back', 'pole_no_points', 'first_win', 'win_on_debut', 'longest_wait', 'one_two', 'youngest_winner', 'oldest_winner');
$$;
