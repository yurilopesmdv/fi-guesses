-- Acompanhar pilotos, equipes e pistas (perfil privado).
-- Equipes ganham identidade estável da fonte (constructorId da Jolpica), separada do nome exibido.

-- Inversa exata de teamName() em src/lib/f1api.ts: nomes da tabela TEAM_NAMES ou id com "_" → " " e iniciais maiúsculas.
create function public.team_constructor_id(p_team text) returns text
language sql immutable set search_path = public as $$
  select case p_team
    when 'Mercedes' then 'mercedes' when 'Red Bull' then 'red_bull' when 'Ferrari' then 'ferrari' when 'McLaren' then 'mclaren'
    when 'Aston Martin' then 'aston_martin' when 'Alpine' then 'alpine' when 'Williams' then 'williams' when 'Racing Bulls' then 'rb'
    when 'Audi' then 'audi' when 'Haas' then 'haas' when 'Cadillac' then 'cadillac'
    when 'Sauber' then 'sauber' when 'AlphaTauri' then 'alphatauri' when 'Alfa Romeo' then 'alfa' when 'Toro Rosso' then 'toro_rosso'
    when 'Racing Point' then 'racing_point' when 'Renault' then 'renault' when 'Force India' then 'force_india' when 'Lotus' then 'lotus_f1'
    when 'Manor' then 'manor' when 'Caterham' then 'caterham' when 'Marussia' then 'marussia' when 'Brawn' then 'brawn'
    when 'Toyota' then 'toyota' when 'BMW Sauber' then 'bmw_sauber' when 'Honda' then 'honda'
    else lower(replace(p_team, ' ', '_'))
  end
$$;

alter table public.drivers add column constructor_id text;
alter table public.race_results add column constructor_id text;
alter table public.constructor_standings add column constructor_id text;

-- Clientes antigos ainda não enviam a coluna: deriva do nome somente na F1 e quando a fonte não informou.
create function public.fill_constructor_id() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.series <> 'f1' or new.team is null then
    new.constructor_id := null;
  elsif new.constructor_id is null
     or (tg_op = 'UPDATE' and new.team is distinct from old.team and new.constructor_id is not distinct from old.constructor_id) then
    new.constructor_id := team_constructor_id(new.team);
  end if;
  return new;
end $$;
create trigger drivers_constructor_id before insert or update on public.drivers for each row execute function public.fill_constructor_id();
create trigger race_results_constructor_id before insert or update on public.race_results for each row execute function public.fill_constructor_id();
create trigger constructor_standings_constructor_id before insert or update on public.constructor_standings for each row execute function public.fill_constructor_id();

update public.drivers set constructor_id = team_constructor_id(team) where series = 'f1' and team is not null;
update public.race_results set constructor_id = team_constructor_id(team) where series = 'f1' and team is not null;
update public.constructor_standings set constructor_id = team_constructor_id(team) where series = 'f1' and team is not null;
create index race_results_constructor_idx on public.race_results (constructor_id, season) where series = 'f1';
create index drivers_constructor_idx on public.drivers (constructor_id, season) where series = 'f1';

-- Favoritos: privados, um por entidade, removíveis sem afetar dados esportivos ou palpites.
create table public.follows (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('driver', 'team', 'circuit')),
  entity_id text not null check (length(entity_id) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, entity_id)
);
alter table public.follows enable row level security;
create policy "follows: read own" on public.follows for select to authenticated using (user_id = auth.uid());
create policy "follows: insert own" on public.follows for insert to authenticated with check (user_id = auth.uid());
create policy "follows: delete own" on public.follows for delete to authenticated using (user_id = auth.uid());
revoke all on public.follows from anon;
grant select, insert, delete on public.follows to authenticated;

create function public.validate_follow() returns trigger
language plpgsql security definer set search_path = public as $$
declare found_entity boolean;
begin
  if (select count(*) from follows where user_id = new.user_id) >= 60 then
    raise exception 'Limite de 60 acompanhamentos atingido.';
  end if;
  found_entity := case new.kind
    when 'driver' then exists (select 1 from drivers where series = 'f1' and driver_id = new.entity_id)
    when 'team' then exists (select 1 from race_results where series = 'f1' and constructor_id = new.entity_id)
      or exists (select 1 from drivers where series = 'f1' and constructor_id = new.entity_id)
    when 'circuit' then exists (select 1 from circuits where id = new.entity_id and published)
  end;
  if not found_entity then
    raise exception 'Item para acompanhar não encontrado.';
  end if;
  return new;
end $$;
create trigger follows_validate before insert on public.follows for each row execute function public.validate_follow();

-- Resumo esportivo do que o próprio usuário acompanha. Nada de bolões ou palpites aqui.
create function public.my_follows_overview() returns jsonb
language sql stable security invoker set search_path = public as $$
 with cur as (select coalesce(max(season), extract(year from now())::int) as season from races where series = 'f1'),
 next_race as (
  select id, name, country, circuit_id, date_utc, round, season from races
  where series = 'f1' and date_utc > now() order by date_utc limit 1
 ),
 mine as (select kind, entity_id, created_at from follows where user_id = auth.uid()),
 drv as (
  select f.entity_id, f.created_at, d.*,
   exists (select 1 from drivers x, cur where x.series = 'f1' and x.season = cur.season and x.driver_id = f.entity_id) as active,
   (select jsonb_build_object('race_id', r.id, 'season', rr.season, 'round', rr.round, 'name', r.name, 'country', r.country, 'date_utc', r.date_utc,
      'grid', rr.grid, 'position', rr.position, 'points', rr.points, 'status', rr.status, 'team', rr.team)
    from race_results rr join drivers x on x.series = rr.series and x.season = rr.season and x.code = rr.driver_code
    join races r on r.series = rr.series and r.season = rr.season and r.round = rr.round
    where rr.series = 'f1' and rr.session = 'race' and x.driver_id = f.entity_id
    order by r.date_utc desc limit 1) as last_race,
   (select jsonb_build_object('season', s.season, 'position', s.position, 'points', s.points, 'wins', s.wins)
    from driver_standings s join drivers x on x.series = s.series and x.season = s.season and x.code = s.driver_code
    where s.series = 'f1' and x.driver_id = f.entity_id order by s.season desc limit 1) as standing
  from mine f
  cross join lateral (select name, code, number, team, team_color, headshot_url from drivers
   where series = 'f1' and driver_id = f.entity_id order by season desc limit 1) d
  where f.kind = 'driver'
 ),
 tm as (
  select f.entity_id, f.created_at, t.team, t.team_color,
   exists (select 1 from drivers x, cur where x.series = 'f1' and x.season = cur.season and x.constructor_id = f.entity_id) as active,
   (select jsonb_build_object('season', s.season, 'position', s.position, 'points', s.points, 'wins', s.wins)
    from constructor_standings s where s.series = 'f1' and s.constructor_id = f.entity_id order by s.season desc limit 1) as standing,
   (select jsonb_build_object('race_id', r.id, 'season', r.season, 'round', r.round, 'name', r.name, 'country', r.country, 'date_utc', r.date_utc,
      'drivers', (select jsonb_agg(jsonb_build_object('code', rr.driver_code, 'name', x.name, 'driver_id', x.driver_id, 'grid', rr.grid,
          'position', rr.position, 'points', rr.points, 'status', rr.status) order by rr.position)
        from race_results rr left join drivers x on x.series = rr.series and x.season = rr.season and x.code = rr.driver_code
        where rr.series = 'f1' and rr.session = 'race' and rr.season = r.season and rr.round = r.round and rr.constructor_id = f.entity_id))
    from races r
    where r.series = 'f1' and (r.season, r.round) = (
      select rr.season, rr.round from race_results rr where rr.series = 'f1' and rr.session = 'race' and rr.constructor_id = f.entity_id
      order by rr.season desc, rr.round desc limit 1)) as last_race
  from mine f
  -- Equipe nova pode existir só na lista de pilotos antes da primeira corrida.
  cross join lateral (select coalesce(
    (select rr.team from race_results rr where rr.series = 'f1' and rr.constructor_id = f.entity_id order by rr.season desc, rr.round desc limit 1),
    (select x.team from drivers x where x.series = 'f1' and x.constructor_id = f.entity_id order by x.season desc limit 1)) as team,
   coalesce((select x.team_color from drivers x where x.series = 'f1' and x.constructor_id = f.entity_id and x.team_color is not null order by x.season desc limit 1), '#888') as team_color) t
  where f.kind = 'team'
 ),
 cir as (
  select f.entity_id, f.created_at, c.name, c.locality, c.country,
   (select jsonb_build_object('race_id', r.id, 'name', r.name, 'date_utc', r.date_utc, 'round', r.round, 'season', r.season)
    from races r where r.series = 'f1' and r.circuit_id = f.entity_id and r.date_utc > now() order by r.date_utc limit 1) as next_race,
   (select jsonb_build_object('season', w.season, 'name', w.race_name, 'date_utc', w.date_utc, 'driver_id', w.driver_id, 'driver_name', w.driver_name, 'team', w.team)
    from (
     select season, race_name, date_utc, driver_id, driver_name, team from circuit_race_winners where circuit_id = f.entity_id
     union all
     select r.season, r.name, r.date_utc, x.driver_id, x.name, rr.team from races r
     join race_results rr on rr.series = r.series and rr.season = r.season and rr.round = r.round and rr.session = 'race' and rr.position = 1
     join drivers x on x.series = rr.series and x.season = rr.season and x.code = rr.driver_code
     where r.series = 'f1' and r.circuit_id = f.entity_id
    ) w order by w.date_utc desc limit 1) as last_winner
  from mine f join circuits c on c.id = f.entity_id
  where f.kind = 'circuit'
 )
 select jsonb_build_object(
  'season', (select season from cur),
  'next_race', (select to_jsonb(n) from next_race n),
  'drivers', coalesce((select jsonb_agg(jsonb_build_object('driver_id', entity_id, 'name', name, 'code', code, 'number', number, 'team', team,
     'team_color', team_color, 'headshot_url', headshot_url, 'active', active, 'last_race', last_race, 'standing', standing) order by created_at) from drv), '[]'),
  'teams', coalesce((select jsonb_agg(jsonb_build_object('constructor_id', entity_id, 'team', team, 'team_color', team_color, 'active', active,
     'standing', standing, 'last_race', last_race) order by created_at) from tm), '[]'),
  'circuits', coalesce((select jsonb_agg(jsonb_build_object('circuit_id', entity_id, 'name', name, 'locality', locality, 'country', country,
     'next_race', next_race, 'last_winner', last_winner) order by created_at) from cir), '[]'),
  'synced_at', (select synced_at from f1_sync where series = 'f1' and season = (select season from cur)),
  'generated_at', now()
 ) where auth.uid() is not null;
$$;
revoke all on function public.my_follows_overview() from public, anon;
grant execute on function public.my_follows_overview() to authenticated;
