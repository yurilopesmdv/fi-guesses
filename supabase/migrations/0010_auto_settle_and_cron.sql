-- Apuração automática: quando o resultado oficial da F1 existe, grava o pódio em todos os bolões sem apuração
create or replace function public.auto_settle_podiums(p_season int) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with podium as (
    select r.id as race_id,
           jsonb_build_object('p1', max(rr.driver_code) filter (where rr.position = 1),
                              'p2', max(rr.driver_code) filter (where rr.position = 2),
                              'p3', max(rr.driver_code) filter (where rr.position = 3)) as answer
    from races r join race_results rr on rr.series = r.series and rr.season = r.season and rr.round = r.round and rr.session = 'race'
    where r.series = 'f1' and r.season = p_season and r.date_utc < now()
    group by r.id having count(*) filter (where rr.position <= 3) = 3
  ),
  ins as (
    insert into results (question_id, answer, set_by)
    select q.id, p.answer, null from questions q join podium p on p.race_id = q.race_id
    where q.kind = 'podium' and not exists (select 1 from results x where x.question_id = q.id)
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- Agendamento: chama a Edge Function sync-series (F1+F2+F3) a cada hora
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'sync-series-hourly';
select cron.schedule('sync-series-hourly', '5 * * * *', $$
  select net.http_post(
    url := (select value from app_settings where key = 'functions_url') || '/sync-series',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select value from app_settings where key = 'anon_key')),
    body := '{"series":"all"}'::jsonb
  );
$$);
