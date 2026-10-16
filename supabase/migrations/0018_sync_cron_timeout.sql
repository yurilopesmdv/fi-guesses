-- O pg_net usa 5 segundos por padrão; importar as três categorias demora mais.
-- Preserva job, horário e permissões, alterando apenas a chamada HTTP.
do $$
declare sync_job bigint;
begin
  select jobid into sync_job from cron.job where jobname = 'sync-series-hourly';
  if sync_job is null then raise exception 'Job sync-series-hourly não encontrado'; end if;
  perform cron.alter_job(sync_job, command := $command$
    select net.http_post(
      url := (select value from public.app_settings where key = 'functions_url') || '/sync-series',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select value from public.app_settings where key = 'anon_key')),
      body := '{"series":"all"}'::jsonb,
      timeout_milliseconds := 120000
    );
  $command$);
end $$;
