-- Cache de detalhes por GP (H25 voltas, H26 pneus). Escrita só pelo backend (Edge Function race-detail / sync-series).
create table public.race_laps_meta (season int not null, round int not null, laps int not null, fetched_at timestamptz not null default now(), primary key (season, round));
create table public.race_lap_positions (season int not null, round int not null, driver_id text not null, positions smallint[] not null, primary key (season, round, driver_id));
create table public.race_stints (season int not null, round int not null, driver_code text not null, stint int not null, compound text, lap_start int not null, lap_end int,
  primary key (season, round, driver_code, stint));
create table public.race_stints_meta (season int not null, round int not null, status text not null check (status in ('ok', 'none')), attempts int not null default 0,
  checked_at timestamptz not null default now(), primary key (season, round));
do $$ declare t text; begin
  foreach t in array array['race_laps_meta','race_lap_positions','race_stints','race_stints_meta'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: read" on public.%I for select to authenticated using (true)', t, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
