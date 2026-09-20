-- Dados oficiais da F1 (globais, importados da Jolpica)
create table public.race_results (
  season int not null,
  round int not null,
  position int not null,
  driver_code text not null,
  team text,
  grid int,
  points numeric(5,1) not null default 0,
  status text,
  fastest_lap boolean not null default false,
  primary key (season, round, position)
);

create table public.driver_standings (
  season int not null,
  position int not null,
  driver_code text not null,
  team text,
  points numeric(6,1) not null default 0,
  wins int not null default 0,
  primary key (season, driver_code)
);

create table public.constructor_standings (
  season int not null,
  position int not null,
  team text not null,
  team_color text,
  points numeric(6,1) not null default 0,
  wins int not null default 0,
  primary key (season, team)
);

create table public.f1_sync (
  season int primary key,
  last_round_with_results int,
  synced_at timestamptz not null default now()
);

alter table race_results          enable row level security;
alter table driver_standings      enable row level security;
alter table constructor_standings enable row level security;
alter table f1_sync               enable row level security;

create policy "race_results: read"  on race_results for select to authenticated using (true);
create policy "race_results: write" on race_results for all to authenticated using (true) with check (true);
create policy "driver_standings: read"  on driver_standings for select to authenticated using (true);
create policy "driver_standings: write" on driver_standings for all to authenticated using (true) with check (true);
create policy "constructor_standings: read"  on constructor_standings for select to authenticated using (true);
create policy "constructor_standings: write" on constructor_standings for all to authenticated using (true) with check (true);
create policy "f1_sync: read"  on f1_sync for select to authenticated using (true);
create policy "f1_sync: write" on f1_sync for all to authenticated using (true) with check (true);
