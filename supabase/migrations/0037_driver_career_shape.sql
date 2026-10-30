-- Carreira do piloto por passagem em equipe (H15) e melhores sequências entre as próprias largadas (H11).
-- Equipe é a do resultado, não o cadastro anual. Sequência conta largadas consecutivas do piloto, não rodadas do calendário.
create function public.driver_career_shape(p_driver_id text) returns jsonb
language sql stable security invoker set search_path = public as $$
 with res as (
  select dr.*, row_number() over (order by dr.date_utc, dr.round) as n from driver_results dr where dr.driver_id = p_driver_id and dr.team is not null
 ), isl as (
  select *, n - row_number() over (partition by team order by n) as grp from res
 ), stints as (
  select team, min(season) as from_season, max(season) as to_season, count(*) as races,
   count(*) filter (where position = 1) as wins, count(*) filter (where position <= 3) as podiums, sum(points) as points, min(n) as first_n,
   (select x.team_color from drivers x where x.series = 'f1' and x.team = isl.team and x.team_color is not null order by x.season desc limit 1) as color
  from isl group by team, grp
 ), streak as (
  select kind, max(len) as best,
   (array_agg(jsonb_build_object('from', s1, 'to', s2) order by len desc, s2 desc))[1] as span
  from (
   select kind, count(*) as len, min(season) as s1, max(season) as s2 from (
    select k.kind, r.season, r.n, r.n - row_number() over (partition by k.kind order by r.n) as g
    from res r cross join (values ('wins'), ('podiums'), ('points')) k(kind)
    where case k.kind when 'wins' then r.position = 1 when 'podiums' then r.position <= 3 else r.points > 0 end
   ) z group by kind, g
  ) y group by kind
 )
 select jsonb_build_object(
  'stints', coalesce((select jsonb_agg(jsonb_build_object('team', team, 'color', color, 'from', from_season, 'to', to_season, 'races', races,
     'wins', wins, 'podiums', podiums, 'points', points) order by first_n) from stints), '[]'),
  'streaks', coalesce((select jsonb_object_agg(kind, jsonb_build_object('best', best, 'from', span->'from', 'to', span->'to')) from streak), '{}')
 ) where auth.uid() is not null;
$$;
revoke all on function public.driver_career_shape(text) from public, anon;
grant execute on function public.driver_career_shape(text) to authenticated;
