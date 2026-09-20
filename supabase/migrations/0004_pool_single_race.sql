-- Bolão pode ser da temporada inteira (race_id null) ou de um único GP
alter table public.pools add column race_id uuid references public.races(id);

create or replace function public.handle_new_pool() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into pool_members (pool_id, user_id) values (new.id, new.owner_id);
  insert into questions (pool_id, race_id, kind, prompt, points)
  select new.id, r.id, 'podium', 'Pódio', 3 from races r
  where r.season = new.season and (new.race_id is null or r.id = new.race_id);
  return new;
end $$;

create or replace function public.handle_new_race() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into questions (pool_id, race_id, kind, prompt, points)
  select p.id, new.id, 'podium', 'Pódio', 3 from pools p where p.season = new.season and p.race_id is null;
  return new;
end $$;

drop function public.create_pool(text, int, text);
create or replace function public.create_pool(p_name text, p_season int, p_stake_label text default null, p_race_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into pools (name, invite_code, owner_id, season, stake_label, race_id)
  values (p_name, gen_invite_code(), auth.uid(), p_season, p_stake_label, p_race_id)
  returning id into v_id;
  return v_id;
end $$;

-- Resumo pra tela inicial: membros e próxima corrida aberta de cada bolão
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
    where r.season = p.season and (p.race_id is null or r.id = p.race_id)
      and now() < r.date_utc - make_interval(mins => p.lock_minutes_before)
    order by r.date_utc limit 1
  ) nr on true
  left join ranked r on r.pool_id = p.id and r.user_id = auth.uid();
$$;
