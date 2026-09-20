-- Todos os usuários veem todos os bolões e podem entrar com um toque (app de família)
create or replace function public.list_open_pools()
returns table (id uuid, name text, season int, race_id uuid, race_name text, stake_label text, owner_name text, members int, next_race_date timestamptz, is_member boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.season, p.race_id, r.name, p.stake_label, pr.name,
         (select count(*)::int from pool_members m where m.pool_id = p.id),
         (select min(x.date_utc) from races x where x.season = p.season and (p.race_id is null or x.id = p.race_id) and x.date_utc > now()),
         exists (select 1 from pool_members m where m.pool_id = p.id and m.user_id = auth.uid())
  from pools p
  join profiles pr on pr.id = p.owner_id
  left join races r on r.id = p.race_id
  where auth.uid() is not null
  order by p.created_at desc;
$$;

create or replace function public.join_pool_by_id(p_pool uuid) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  insert into pool_members (pool_id, user_id) values (p_pool, auth.uid()) on conflict do nothing;
  return p_pool;
end $$;
