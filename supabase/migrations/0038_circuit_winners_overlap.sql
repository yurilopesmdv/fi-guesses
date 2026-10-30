-- Vencedores em comum entre duas pistas (H20). Inclui acervo histórico e resultados importados por circuit_id.
create function public.circuit_winners_overlap(p_a text, p_b text) returns jsonb
language sql stable security invoker set search_path = public as $$
 with w as (
  select circuit_id, season, round, driver_id, driver_name from circuit_race_winners where circuit_id in (p_a, p_b)
  union
  select coalesce(r.circuit_id, cs.circuit_id), r.season, r.round, x.driver_id, x.name from races r
  left join circuit_seasons cs on cs.season = r.season and cs.round = r.round
  join race_results rr on rr.series = 'f1' and rr.session = 'race' and rr.season = r.season and rr.round = r.round and rr.position = 1
  join drivers x on x.series = 'f1' and x.season = rr.season and x.code = rr.driver_code
  where r.series = 'f1' and coalesce(r.circuit_id, cs.circuit_id) in (p_a, p_b)
 ), per as (
  select driver_id, max(driver_name) as name, count(distinct (season, round)) filter (where circuit_id = p_a) as a,
   count(distinct (season, round)) filter (where circuit_id = p_b) as b
  from w group by driver_id
 )
 select jsonb_build_object(
  'common', coalesce((select jsonb_agg(jsonb_build_object('driver_id', driver_id, 'name', name, 'a', a, 'b', b) order by a + b desc, name) from per where a > 0 and b > 0), '[]'),
  'only_a', (select count(*) from per where a > 0 and b = 0),
  'only_b', (select count(*) from per where b > 0 and a = 0)
 ) where auth.uid() is not null and exists (select 1 from circuits where id = p_a) and exists (select 1 from circuits where id = p_b);
$$;
revoke all on function public.circuit_winners_overlap(text, text) from public, anon;
grant execute on function public.circuit_winners_overlap(text, text) to authenticated;
