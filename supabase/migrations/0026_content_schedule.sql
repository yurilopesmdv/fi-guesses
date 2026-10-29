-- Só PostgreSQL hospedado: o teste isolado não inclui pg_cron/pg_net/Vault.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create or replace function public.enqueue_content_sync() returns bigint
language plpgsql security definer set search_path=public as $$
declare base text; credential text; request_id bigint;
begin
 select decrypted_secret into base from vault.decrypted_secrets where name='content_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='content_service_role';
 if base is null or credential is null then return null;end if;
 select net.http_post(url:=base||'/functions/v1/sync-news',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||credential),body:='{}'::jsonb,timeout_milliseconds:=60000) into request_id;
 return request_id;
end $$;
revoke all on function public.enqueue_content_sync() from public,anon,authenticated;
grant execute on function public.enqueue_content_sync() to service_role;
select cron.unschedule(jobid) from cron.job where jobname='content-news-every-ten-minutes';
select cron.schedule('content-news-every-ten-minutes','*/10 * * * *','select public.enqueue_content_sync();');
