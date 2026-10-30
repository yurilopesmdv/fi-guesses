-- Rivalidade por pista (H13): todos os GPs em que os dois largaram, em qualquer equipe. Posição oficial decide quem chegou à frente.
create function public.driver_rivalry_circuits(p_a text, p_b text) returns jsonb
language sql stable security invoker set search_path = public as $$
 with duel as (
  select a.season, a.round, a.position < b.position as a_ahead, coalesce(r.circuit_id, cs.circuit_id) as circuit_id
  from driver_results a
  join driver_results b on b.season = a.season and b.round = a.round and b.driver_id = p_b
  join races r on r.series = 'f1' and r.season = a.season and r.round = a.round
  left join circuit_seasons cs on cs.season = a.season and cs.round = a.round
  where a.driver_id = p_a and p_a <> p_b
 ), per as (
  select d.circuit_id, c.name, c.country, count(*) as races, count(*) filter (where a_ahead) as a, count(*) filter (where not a_ahead) as b
  from duel d join circuits c on c.id = d.circuit_id group by d.circuit_id, c.name, c.country
 )
 select jsonb_build_object(
  'races', (select count(*) from duel), 'a', (select count(*) filter (where a_ahead) from duel), 'b', (select count(*) filter (where not a_ahead) from duel),
  'circuits', coalesce((select jsonb_agg(to_jsonb(p) order by p.races desc, abs(p.a - p.b) desc, p.name) from per p), '[]')
 ) where auth.uid() is not null;
$$;
revoke all on function public.driver_rivalry_circuits(text, text) from public, anon;
grant execute on function public.driver_rivalry_circuits(text, text) to authenticated;
