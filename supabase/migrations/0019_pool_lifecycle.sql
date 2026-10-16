-- Fechar palpites não finaliza o bolão: a corrida e sua apuração ainda podem
-- estar pendentes. Apenas metadados agregados são expostos, como no catálogo.
create function public.pool_lifecycles(p_pool_ids uuid[] default null)
returns table (
  pool_id uuid, status text, pending_results bigint,
  has_future_races boolean, has_races boolean,
  created_at timestamptz, last_race_date timestamptz
)
language sql stable security definer set search_path = public as $$
  with scope as (
    select p.id, p.created_at, r.id as race_id, r.date_utc
    from public.pools p
    left join public.races r on r.series = 'f1' and r.season = p.season
      and (p.race_id is null or r.id = p.race_id)
    where auth.uid() is not null and (p_pool_ids is null or p.id = any(p_pool_ids))
  ),
  race_state as (
    select s.*,
      (select count(*) from public.questions q
       left join public.results a on a.question_id = q.id
       where q.pool_id = s.id and q.race_id = s.race_id
         and (a.question_id is null or (q.kind = 'podium' and
           (nullif(a.answer->>'p1', '') is null or nullif(a.answer->>'p2', '') is null or nullif(a.answer->>'p3', '') is null))))
      + case when s.race_id is not null and not exists (
          select 1 from public.questions q where q.pool_id = s.id and q.race_id = s.race_id and q.kind = 'podium'
        ) then 1 else 0 end as missing
    from scope s
  ),
  totals as (
    select id, created_at, count(race_id) > 0 as has_races,
      coalesce(bool_or(date_utc > now()), false) as has_future_races,
      coalesce(sum(missing) filter (where date_utc <= now()), 0)::bigint as pending_results,
      max(date_utc) as last_race_date
    from race_state group by id, created_at
  )
  select id,
    case when has_races and not has_future_races and pending_results = 0 then 'finished' else 'ongoing' end,
    pending_results, has_future_races, has_races, created_at, last_race_date
  from totals
  order by (has_races and not has_future_races and pending_results = 0), created_at desc, id;
$$;

revoke all on function public.pool_lifecycles(uuid[]) from public, anon;
grant execute on function public.pool_lifecycles(uuid[]) to authenticated;
