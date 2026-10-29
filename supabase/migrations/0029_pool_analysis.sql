create function public.pool_analysis(p_pool uuid) returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'questions',coalesce((select jsonb_agg(q order by q.position,q.created_at) from questions q where q.pool_id=p_pool),'[]'::jsonb),
 'predictions',coalesce((select jsonb_agg(p) from predictions p join questions q on q.id=p.question_id where q.pool_id=p_pool),'[]'::jsonb),
 'results',coalesce((select jsonb_agg(r) from results r join questions q on q.id=r.question_id where q.pool_id=p_pool),'[]'::jsonb),
 'races',coalesce((select jsonb_agg(r order by r.date_utc,r.id) from races r where r.series='f1' and exists(select 1 from questions q where q.pool_id=p_pool and q.race_id=r.id)),'[]'::jsonb)
 ) where auth.uid() is not null and is_member(p_pool);
$$;
revoke all on function public.pool_analysis(uuid) from public,anon;
grant execute on function public.pool_analysis(uuid) to authenticated;
