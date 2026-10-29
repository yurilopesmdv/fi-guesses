-- Credencial própria para o coletor: não compara o JWT legado com o token interno do runtime.
create or replace function public.enqueue_content_sync() returns bigint
language plpgsql security definer set search_path=public as $$
declare base text; credential text; collector_secret text; request_id bigint;
begin
 select decrypted_secret into base from vault.decrypted_secrets where name='content_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='content_service_role';
 select decrypted_secret into collector_secret from vault.decrypted_secrets where name='content_cron_secret';
 if base is null or credential is null or collector_secret is null then return null;end if;
 select net.http_post(url:=base||'/functions/v1/sync-news',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||credential,'X-Content-Sync-Secret',collector_secret),body:='{}'::jsonb,timeout_milliseconds:=60000) into request_id;
 return request_id;
end $$;
revoke all on function public.enqueue_content_sync() from public,anon,authenticated;
grant execute on function public.enqueue_content_sync() to service_role;
