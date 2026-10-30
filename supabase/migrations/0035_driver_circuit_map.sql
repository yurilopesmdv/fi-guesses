-- Pódios de um piloto por pista (para o mapa). Cada ponto traz as provas que sustentam a contagem.
create function public.driver_circuit_map(p_driver_id text) returns jsonb
language sql stable security invoker set search_path = public as $$
 select coalesce(jsonb_agg(x order by x.wins desc, x.podiums desc, x.name), '[]') from (
  select c.id, c.name, c.country, c.latitude, c.longitude,
   count(*) filter (where dr.position = 1) as wins, count(*) as podiums,
   jsonb_agg(jsonb_build_object('season', dr.season, 'round', dr.round, 'race_name', dr.race_name, 'position', dr.position) order by dr.season, dr.round) as results
  from driver_results dr
  join races r on r.series = 'f1' and r.season = dr.season and r.round = dr.round
  left join circuit_seasons cs on cs.season = dr.season and cs.round = dr.round
  join circuits c on c.id = coalesce(r.circuit_id, cs.circuit_id) and c.published
  where dr.driver_id = p_driver_id and dr.position <= 3
  group by c.id
 ) x where auth.uid() is not null;
$$;
revoke all on function public.driver_circuit_map(text) from public, anon;
grant execute on function public.driver_circuit_map(text) to authenticated;
