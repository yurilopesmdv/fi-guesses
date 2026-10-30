-- Recordes acumulados até o fim de uma temporada (H19). Não reconstrói campeonatos; só totais de resultados.
create function public.records_until(p_season int) returns jsonb
language sql stable security invoker set search_path = public as $$
 with t as (
  select driver_id, count(*) filter (where position = 1) as wins, count(*) filter (where position <= 3) as podiums,
   count(*) as starts, count(*) filter (where grid = 1) as p1
  from driver_results where season <= p_season group by driver_id
 ), top as (
  select k.kind, x.driver_id, x.v, rank() over (partition by k.kind order by x.v desc) as rk
  from (values ('wins'), ('podiums'), ('starts'), ('p1')) k(kind)
  cross join lateral (select driver_id, case k.kind when 'wins' then wins when 'podiums' then podiums when 'starts' then starts else p1 end as v from t) x
 )
 select jsonb_object_agg(kind, items) from (
  select kind, jsonb_agg(jsonb_build_object('driver_id', driver_id, 'value', v, 'rank', rk,
    'name', (select d.name from drivers d where d.series = 'f1' and d.driver_id = top.driver_id order by d.season desc limit 1)) order by rk, driver_id) as items
  from top where rk <= 5 and v > 0 group by kind
 ) z where auth.uid() is not null;
$$;
revoke all on function public.records_until(int) from public, anon;
grant execute on function public.records_until(int) to authenticated;
