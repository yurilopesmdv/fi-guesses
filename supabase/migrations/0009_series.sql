-- Múltiplas categorias: f1 (padrão), f2, f3. Bolões continuam só na F1.
alter table public.races                 add column series text not null default 'f1';
alter table public.drivers               add column series text not null default 'f1';
alter table public.race_results          add column series text not null default 'f1',
                                         add column session text not null default 'race'; -- race | sprint | feature
alter table public.driver_standings      add column series text not null default 'f1';
alter table public.constructor_standings add column series text not null default 'f1';
alter table public.f1_sync               add column series text not null default 'f1';

alter table public.races drop constraint races_season_round_key;
alter table public.races add constraint races_series_season_round_key unique (series, season, round);
alter table public.drivers drop constraint drivers_pkey;
alter table public.drivers add primary key (series, season, code);
alter table public.race_results drop constraint race_results_pkey;
alter table public.race_results add primary key (series, season, round, session, position, driver_code);
alter table public.driver_standings drop constraint driver_standings_pkey;
alter table public.driver_standings add primary key (series, season, driver_code);
alter table public.constructor_standings drop constraint constructor_standings_pkey;
alter table public.constructor_standings add primary key (series, season, team);
alter table public.f1_sync drop constraint f1_sync_pkey;
alter table public.f1_sync add primary key (series, season);

-- Bolões: perguntas de pódio e "próxima corrida" só consideram F1
create or replace function public.handle_new_pool() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into pool_members (pool_id, user_id) values (new.id, new.owner_id);
  insert into questions (pool_id, race_id, kind, prompt, points)
  select new.id, r.id, 'podium', 'Pódio', 3 from races r
  where r.series = 'f1' and r.season = new.season and (new.race_id is null or r.id = new.race_id);
  return new;
end $$;

create or replace function public.handle_new_race() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.series <> 'f1' then return new; end if;
  insert into questions (pool_id, race_id, kind, prompt, points)
  select p.id, new.id, 'podium', 'Pódio', 3 from pools p where p.season = new.season and p.race_id is null;
  return new;
end $$;

create or replace function public.my_pools_summary()
returns table (pool_id uuid, members int, next_race_name text, next_race_date timestamptz, my_total int, my_rank int)
language sql stable security definer set search_path = public as $$
  with mine as (select p.* from pools p join pool_members m on m.pool_id = p.id and m.user_id = auth.uid()),
  ranked as (
    select s.pool_id, s.user_id, s.total, rank() over (partition by s.pool_id order by s.total desc) rk
    from pool_standings s where s.pool_id in (select id from mine)
  )
  select p.id,
         (select count(*)::int from pool_members m where m.pool_id = p.id),
         nr.name, nr.date_utc,
         coalesce(r.total, 0)::int, coalesce(r.rk, 1)::int
  from mine p
  left join lateral (
    select r.name, r.date_utc from races r
    where r.series = 'f1' and r.season = p.season and (p.race_id is null or r.id = p.race_id)
      and now() < r.date_utc - make_interval(mins => p.lock_minutes_before)
    order by r.date_utc limit 1
  ) nr on true
  left join ranked r on r.pool_id = p.id and r.user_id = auth.uid();
$$;

create or replace function public.list_open_pools()
returns table (id uuid, name text, season int, race_id uuid, race_name text, stake_label text, owner_name text, members int, next_race_date timestamptz, is_member boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.season, p.race_id, r.name, p.stake_label, pr.name,
         (select count(*)::int from pool_members m where m.pool_id = p.id),
         (select min(x.date_utc) from races x where x.series = 'f1' and x.season = p.season and (p.race_id is null or x.id = p.race_id) and x.date_utc > now()),
         exists (select 1 from pool_members m where m.pool_id = p.id and m.user_id = auth.uid())
  from pools p
  join profiles pr on pr.id = p.owner_id
  left join races r on r.id = p.race_id
  where auth.uid() is not null
  order by p.created_at desc;
$$;
