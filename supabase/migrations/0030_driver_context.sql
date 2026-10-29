create function public.driver_race_context(p_driver text,p_season integer,p_before timestamptz,p_circuit text default null) returns jsonb
language sql stable security invoker set search_path=public as $$
 with history as (
 select r.name,r.date_utc,r.season,r.round,r.circuit_id,rr.position,rr.grid,rr.status
 from race_results rr join drivers d on d.series=rr.series and d.season=rr.season and d.code=rr.driver_code
 join races r on r.series=rr.series and r.season=rr.season and r.round=rr.round
 where rr.series='f1' and rr.session='race' and d.driver_id=p_driver and r.date_utc<least(p_before,now())
 ),recent as(select * from history where season=p_season order by date_utc desc limit 5),at_circuit as(select * from history where circuit_id=p_circuit order by date_utc desc limit 20)
 select jsonb_build_object('recent',coalesce((select jsonb_agg(recent order by date_utc desc) from recent),'[]'::jsonb),'circuit',coalesce((select jsonb_agg(at_circuit order by date_utc desc) from at_circuit),'[]'::jsonb)) where auth.uid() is not null;
$$;
revoke all on function public.driver_race_context(text,integer,timestamptz,text) from public,anon;
grant execute on function public.driver_race_context(text,integer,timestamptz,text) to authenticated;
