-- Resumo privado do último GP de F1 com resultado: pontos e posição antes/depois em cada bolão do chamador.
-- Resultado esportivo (race_results) e apuração do bolão (results) são estados separados.
create function public.my_last_gp_summary() returns jsonb
language sql stable security definer set search_path = public as $$
 with last as (
  select r.id, r.name, r.country, r.round, r.season, r.date_utc, r.circuit_id from races r
  where r.series = 'f1' and r.date_utc <= now()
    and exists (select 1 from race_results rr where rr.series = 'f1' and rr.session = 'race' and rr.season = r.season and rr.round = r.round)
  order by r.date_utc desc limit 1
 ), mine as (
  select p.id, p.name from pools p join pool_members m on m.pool_id = p.id and m.user_id = auth.uid(), last
  where p.season = last.season and (p.race_id is null or p.race_id = last.id)
    and exists (select 1 from questions q where q.pool_id = p.id and q.race_id = last.id)
 ), scored as (
  select m.pool_id, m.user_id,
   coalesce(sum(s.points) filter (where r.date_utc < last.date_utc), 0) as before_total,
   coalesce(sum(s.points) filter (where r.date_utc <= last.date_utc), 0) as after_total,
   coalesce(sum(s.points) filter (where r.id = last.id), 0) as gp_points
  from pool_members m cross join last
  left join race_scores s on s.pool_id = m.pool_id and s.user_id = m.user_id
  left join races r on r.id = s.race_id
  where m.pool_id in (select id from mine)
  group by m.pool_id, m.user_id
 ), ranked as (
  select *, rank() over (partition by pool_id order by before_total desc) as rank_before,
   rank() over (partition by pool_id order by after_total desc) as rank_after,
   count(*) over (partition by pool_id) as members
  from scored
 ), settle as (
  select q.pool_id, count(*) as questions, count(a.question_id) as settled
  from questions q cross join last left join results a on a.question_id = q.id
  where q.race_id = last.id and q.pool_id in (select id from mine) group by q.pool_id
 )
 select jsonb_build_object(
  'race', (select to_jsonb(l) from last l),
  'next_race', (select jsonb_build_object('id', id, 'name', name, 'country', country, 'date_utc', date_utc)
    from races where series = 'f1' and date_utc > now() order by date_utc limit 1),
  'pools', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'points', k.gp_points, 'total', k.after_total,
     'rank_before', k.rank_before, 'rank_after', k.rank_after, 'members', k.members, 'questions', st.questions, 'settled', st.settled,
     'status', case when st.settled = 0 then 'waiting' when st.settled < st.questions then 'partial' else 'settled' end) order by m.name)
    from mine m join ranked k on k.pool_id = m.id and k.user_id = auth.uid() join settle st on st.pool_id = m.id), '[]'),
  'generated_at', now()
 ) where auth.uid() is not null;
$$;
revoke all on function public.my_last_gp_summary() from public, anon;
grant execute on function public.my_last_gp_summary() to authenticated;
