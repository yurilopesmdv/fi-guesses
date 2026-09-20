-- Configurações lidas pelo app (ex.: credenciais OpenF1 pra tempo real). Escrita só via SQL.
create table public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security;
create policy "app_settings: read" on app_settings for select to authenticated using (true);
