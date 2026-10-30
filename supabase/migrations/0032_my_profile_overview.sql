-- Visão privada do próprio participante. Não recebe user_id nem abre bolões de terceiros.
create function public.my_profile_overview() returns jsonb
language sql stable security definer set search_path=public as $$
 with mine as materialized (
  select p.id,p.name,p.season,p.created_at,p.race_id,p.lock_minutes_before,m.joined_at
  from pools p join pool_members m on m.pool_id=p.id
  where m.user_id=auth.uid()
 ), ranks as (
  select s.*,rank() over(partition by s.pool_id order by s.total desc) as place,
   count(*) over(partition by s.pool_id) as members
  from pool_standings s where s.pool_id in(select id from mine)
 ), question_rows as (
  select q.pool_id,q.kind,q.points,q.near_points,a.answer as result,p.answer as prediction,
   question_lock_at(q.id)<=now() and m.joined_at<=question_lock_at(q.id)
    and q.created_at<=question_lock_at(q.id) as eligible,
   case q.kind
    when 'podium' then nullif(p.answer->>'p1','') is not null and nullif(p.answer->>'p2','') is not null and nullif(p.answer->>'p3','') is not null
      and p.answer->>'p1'<>p.answer->>'p2' and p.answer->>'p1'<>p.answer->>'p3' and p.answer->>'p2'<>p.answer->>'p3'
    when 'driver' then nullif(p.answer->>'driver','') is not null
    when 'yesno' then jsonb_typeof(p.answer->'v')='boolean'
    when 'position_of_driver' then jsonb_typeof(p.answer->'pos')='number'
    when 'text' then nullif(btrim(p.answer->>'t'),'') is not null
   end as answered
  from mine m join questions q on q.pool_id=m.id
  join races r on r.id=q.race_id and r.series='f1' and r.season=m.season and(m.race_id is null or r.id=m.race_id)
  left join predictions p on p.question_id=q.id and p.user_id=auth.uid()
  left join results a on a.question_id=q.id
 ), metrics as (
  select pool_id,count(*) filter(where result is not null) as scored_questions,
   coalesce(sum(case when result is null then 0 when kind='podium' then
     3*((nullif(result->>'p1','') is not null)::int+(nullif(result->>'p2','') is not null)::int+(nullif(result->>'p3','') is not null)::int)
    when kind='position_of_driver' then greatest(points,near_points) else points end),0) as max_points,
   coalesce(sum(score_answer(kind,points,near_points,prediction,result,auth.uid())),0) as earned_points,
   count(*) filter(where kind='podium' and nullif(result->>'p1','') is not null and nullif(result->>'p2','') is not null and nullif(result->>'p3','') is not null
    and result->>'p1'<>result->>'p2' and result->>'p1'<>result->>'p3' and result->>'p2'<>result->>'p3'
    and prediction->>'p1'=result->>'p1' and prediction->>'p2'=result->>'p2' and prediction->>'p3'=result->>'p3') as exact_podiums,
   count(*) filter(where eligible) as eligible_questions,count(*) filter(where eligible and answered) as answered_questions
  from question_rows group by pool_id
 ), entries as (
  select m.id,m.name,m.season,m.created_at,s.total,s.place as rank,s.members,l.status,
   coalesce(q.scored_questions,0) as scored_questions,coalesce(q.max_points,0) as max_points,
   coalesce(q.earned_points,0) as earned_points,coalesce(q.exact_podiums,0) as exact_podiums,
   coalesce(q.eligible_questions,0) as eligible_questions,coalesce(q.answered_questions,0) as answered_questions
  from mine m join ranks s on s.pool_id=m.id and s.user_id=auth.uid()
  join pool_lifecycles(array(select id from mine)) l on l.pool_id=m.id
  left join metrics q on q.pool_id=m.id
 )
 select jsonb_build_object(
  'profile',(select jsonb_build_object('id',id,'name',name,'avatar',avatar) from profiles where id=auth.uid()),
  'global',(select jsonb_build_object('rank',rank,'total',total,'pools_played',pools_played) from global_standings() where user_id=auth.uid()),
  'pools',coalesce((select jsonb_agg(e order by (e.status='finished'),e.created_at desc,e.id) from entries e),'[]'::jsonb),
  'generated_at',now()
 ) where auth.uid() is not null;
$$;
revoke all on function public.my_profile_overview() from public,anon;
grant execute on function public.my_profile_overview() to authenticated;
