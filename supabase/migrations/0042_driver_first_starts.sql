-- Primeiras N largadas de dois pilotos (H12). Exclui inscrições sem largada (Withdrew / Did not start).
create function public.driver_first_starts(p_a text, p_b text, p_n int) returns jsonb
language sql stable security invoker set search_path = public as $$
 with starts as (
  select dr.driver_id, dr.position, dr.grid, dr.points, dr.season,
   row_number() over (partition by dr.driver_id order by dr.date_utc, dr.round) as n
  from driver_results dr
  where dr.driver_id in (p_a, p_b) and coalesce(dr.status, '') not in ('Withdrew', 'Did not start')
 )
 select jsonb_object_agg(driver_id, jsonb_build_object('starts', starts, 'wins', wins, 'podiums', podiums, 'points', points, 'p1_starts', p1, 'until', until))
 from (
  select driver_id, count(*) as starts, count(*) filter (where position = 1) as wins, count(*) filter (where position <= 3) as podiums,
   sum(points) as points, count(*) filter (where grid = 1) as p1, max(season) as until
  from starts where n <= least(greatest(p_n, 1), 400) group by driver_id
 ) x where auth.uid() is not null;
$$;
revoke all on function public.driver_first_starts(text, text, int) from public, anon;
grant execute on function public.driver_first_starts(text, text, int) to authenticated;
