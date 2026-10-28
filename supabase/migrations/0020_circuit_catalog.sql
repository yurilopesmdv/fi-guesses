-- Catálogo editorial de pistas. Escrita exclusiva do backend; leitura autenticada.
create table public.circuits (
  id text primary key,
  name text not null,
  locality text not null,
  country text not null,
  latitude double precision,
  longitude double precision,
  description text not null default '',
  official_url text not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.circuit_seasons (
  circuit_id text not null references public.circuits(id) on delete cascade,
  season integer not null check (season >= 1950),
  round integer not null check (round > 0),
  race_name text not null,
  date_utc timestamptz not null,
  primary key (season, round)
);
create index circuit_seasons_circuit on public.circuit_seasons(circuit_id, season);
create table public.circuit_layouts (
  circuit_id text not null references public.circuits(id) on delete cascade,
  season integer not null,
  length_m integer not null check (length_m > 0),
  turns integer not null check (turns > 0),
  direction text not null check (direction in ('clockwise','anticlockwise','figure_eight')),
  source_url text not null,
  gp_laps integer,
  gp_distance_km numeric,
  lap_record_time text,
  lap_record_driver text,
  lap_record_year integer,
  notes text not null default '',
  primary key (circuit_id, season)
);
create table public.circuit_media (
  id text primary key,
  circuit_id text not null references public.circuits(id) on delete cascade,
  kind text not null check (kind in ('photo','map')),
  sort_order integer not null default 0,
  storage_path text not null,
  thumbnail_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  caption text not null,
  author text not null,
  license text not null,
  license_url text not null,
  source_url text not null,
  period text,
  layout_season integer,
  published boolean not null default false
);
create index circuit_media_order on public.circuit_media(circuit_id, kind, sort_order);
create table public.circuit_race_winners (
  circuit_id text not null references public.circuits(id) on delete cascade,
  season integer not null,
  round integer not null,
  race_name text not null,
  date_utc timestamptz not null,
  driver_id text not null,
  driver_name text not null,
  team text,
  primary key (circuit_id, season, round, driver_id)
);
create table public.circuit_imports (
  circuit_id text primary key references public.circuits(id) on delete cascade,
  results_complete boolean not null default false,
  synced_at timestamptz not null default now(),
  source_url text not null
);

-- Identidade da fonte: novas pistas podem aparecer antes de receber um perfil editorial.
-- A relação é lógica, para não bloquear importações de temporadas históricas/novas.
alter table public.races add column circuit_id text;
create index races_circuit_id on public.races(circuit_id) where series = 'f1';

alter table public.circuits enable row level security;
alter table public.circuit_seasons enable row level security;
alter table public.circuit_layouts enable row level security;
alter table public.circuit_media enable row level security;
alter table public.circuit_race_winners enable row level security;
alter table public.circuit_imports enable row level security;
create policy circuits_read on public.circuits for select to authenticated using (auth.uid() is not null and published);
create policy circuit_seasons_read on public.circuit_seasons for select to authenticated using (exists (select 1 from public.circuits c where c.id = circuit_id));
create policy circuit_layouts_read on public.circuit_layouts for select to authenticated using (exists (select 1 from public.circuits c where c.id = circuit_id));
create policy circuit_media_read on public.circuit_media for select to authenticated using (published and exists (select 1 from public.circuits c where c.id = circuit_id));
create policy circuit_winners_read on public.circuit_race_winners for select to authenticated using (exists (select 1 from public.circuits c where c.id = circuit_id));
create policy circuit_imports_read on public.circuit_imports for select to authenticated using (exists (select 1 from public.circuits c where c.id = circuit_id));
grant select on public.circuits, public.circuit_seasons, public.circuit_layouts, public.circuit_media, public.circuit_race_winners, public.circuit_imports to authenticated;

create function public.circuit_profile(p_id text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'circuit', to_jsonb(c),
    'layout', (select to_jsonb(l) from circuit_layouts l where l.circuit_id=c.id order by l.season desc limit 1),
    'media', coalesce((select jsonb_agg(to_jsonb(m) order by m.kind desc, m.sort_order, m.id) from circuit_media m where m.circuit_id=c.id and m.published), '[]'::jsonb),
    'stats', jsonb_build_object(
      'first_season', (select min(w.season) from circuit_race_winners w where w.circuit_id=c.id),
      'last_season', (select max(w.season) from circuit_race_winners w where w.circuit_id=c.id),
      'seasons', (select count(distinct w.season) from circuit_race_winners w where w.circuit_id=c.id),
      'races', (select count(distinct (w.season,w.round)) from circuit_race_winners w where w.circuit_id=c.id),
      'different_winners', (select count(distinct w.driver_id) from circuit_race_winners w where w.circuit_id=c.id),
      'record_wins', coalesce((select max(t.wins) from (select count(*) as wins from circuit_race_winners w where w.circuit_id=c.id group by w.driver_id) t),0),
      'complete', coalesce((select i.results_complete from circuit_imports i where i.circuit_id=c.id),false),
      'synced_at', (select i.synced_at from circuit_imports i where i.circuit_id=c.id)
    ),
    'winners', coalesce((select jsonb_agg(to_jsonb(t) order by t.wins desc,t.driver_name) from (
      select w.driver_id, max(w.driver_name) as driver_name, count(*) as wins,
        rank() over (order by count(*) desc) as rank,
        exists(select 1 from drivers d where d.series='f1' and d.driver_id=w.driver_id) as has_profile
      from circuit_race_winners w where w.circuit_id=c.id group by w.driver_id
    ) t where t.rank <= 5), '[]'::jsonb),
    'last_race', (select jsonb_build_object('season',r.season,'round',r.round,'race_name',r.race_name,'date_utc',r.date_utc,
      'race_id',(select a.id from races a where a.series='f1' and a.season=r.season and a.round=r.round and a.circuit_id=c.id limit 1),
      'winners',(select jsonb_agg(jsonb_build_object('driver_id',w.driver_id,'driver_name',w.driver_name,'team',w.team,'has_profile',exists(select 1 from drivers d where d.series='f1' and d.driver_id=w.driver_id)) order by w.driver_name) from circuit_race_winners w where w.circuit_id=c.id and w.season=r.season and w.round=r.round))
      from circuit_race_winners r where r.circuit_id=c.id order by r.date_utc desc,r.season desc,r.round desc limit 1),
    'calendar', coalesce((select jsonb_agg(to_jsonb(s) order by s.date_utc) from circuit_seasons s where s.circuit_id=c.id), '[]'::jsonb)
  ) from circuits c where c.id=p_id and c.published;
$$;

create function public.circuit_catalog(p_season integer) returns setof jsonb
language sql stable security invoker set search_path = public as $$
  select (p.value - 'winners' - 'media' - 'calendar') || jsonb_build_object(
    'cover', (select to_jsonb(m) from circuit_media m where m.circuit_id=c.id and m.kind='photo' and m.published order by m.sort_order,m.id limit 1),
    'map', (select to_jsonb(m) from circuit_media m where m.circuit_id=c.id and m.kind='map' and m.published order by m.layout_season desc nulls last,m.sort_order,m.id limit 1),
    'calendar', coalesce((select jsonb_agg(to_jsonb(s) order by s.date_utc) from circuit_seasons s where s.circuit_id=c.id and s.season=p_season),'[]'::jsonb)
  ) from circuits c cross join lateral (select circuit_profile(c.id) as value) p
  where c.published and exists (select 1 from circuit_seasons s where s.circuit_id=c.id and s.season=p_season)
  order by (select min(s.round) from circuit_seasons s where s.circuit_id=c.id and s.season=p_season),c.id;
$$;
revoke all on function public.circuit_profile(text), public.circuit_catalog(integer) from public;
grant execute on function public.circuit_profile(text), public.circuit_catalog(integer) to authenticated;

-- Atualiza apenas edições presentes nos resultados oficiais locais. Uma correção
-- substitui os vencedores daquela edição sem apagar o acervo histórico importado.
create function public.refresh_circuit_winners(p_season integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  delete from circuit_race_winners w using races r
    where r.series='f1' and r.season=p_season and w.circuit_id=r.circuit_id and w.season=r.season and w.round=r.round
    and exists(select 1 from race_results rr join drivers d on d.series='f1' and d.season=rr.season and d.code=rr.driver_code
      where rr.series='f1' and rr.session='race' and rr.position=1 and rr.season=r.season and rr.round=r.round and d.driver_id is not null);
  insert into circuit_race_winners(circuit_id,season,round,race_name,date_utc,driver_id,driver_name,team)
    select r.circuit_id,r.season,r.round,r.name,r.date_utc,d.driver_id,d.name,rr.team
    from races r join circuits c on c.id=r.circuit_id
    join race_results rr on rr.series='f1' and rr.session='race' and rr.position=1 and rr.season=r.season and rr.round=r.round
    join drivers d on d.series='f1' and d.season=r.season and d.code=rr.driver_code
    where r.series='f1' and r.season=p_season and d.driver_id is not null
    on conflict(circuit_id,season,round,driver_id) do update set driver_name=excluded.driver_name,team=excluded.team,date_utc=excluded.date_utc,race_name=excluded.race_name;
  get diagnostics affected = row_count;
  return affected;
end $$;
revoke all on function public.refresh_circuit_winners(integer) from public, authenticated, anon;
do $$ begin
  if exists (select 1 from pg_roles where rolname='service_role') then
    grant all on public.circuits,public.circuit_seasons,public.circuit_layouts,public.circuit_media,public.circuit_race_winners,public.circuit_imports to service_role;
    grant execute on function public.refresh_circuit_winners(integer) to service_role;
  end if;
end $$;

-- Isola o bucket mesmo que existam policies permissivas de uploads antigos.
-- PGlite não possui Storage; o comportamento é verificado também no serviço.
do $$ begin
  if to_regclass('storage.objects') is not null then
    execute $policy$create policy circuits_no_client_insert on storage.objects as restrictive for insert to authenticated, anon with check (bucket_id <> 'circuits')$policy$;
    execute $policy$create policy circuits_no_client_update on storage.objects as restrictive for update to authenticated, anon using (bucket_id <> 'circuits') with check (bucket_id <> 'circuits')$policy$;
    execute $policy$create policy circuits_no_client_delete on storage.objects as restrictive for delete to authenticated, anon using (bucket_id <> 'circuits')$policy$;
  end if;
end $$;
