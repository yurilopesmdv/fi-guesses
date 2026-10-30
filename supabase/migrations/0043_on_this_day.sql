-- Aniversários esportivos (H21): GPs disputados em dia/mês próximos (data em Brasília), com vencedor. Até 3 dias de distância.
create function public.f1_on_this_day(p_month int, p_day int) returns jsonb
language sql stable security invoker set search_path = public as $$
 with g as (
  select r.id, r.season, r.round, r.name, r.country, r.date_utc,
   abs(make_date(2000, extract(month from r.date_utc at time zone 'America/Sao_Paulo')::int, extract(day from r.date_utc at time zone 'America/Sao_Paulo')::int)
     - make_date(2000, p_month, p_day)) as dist,
   (select jsonb_build_object('driver_id', x.driver_id, 'name', x.name, 'team', rr.team) from race_results rr
     join drivers x on x.series = 'f1' and x.season = rr.season and x.code = rr.driver_code
     where rr.series = 'f1' and rr.session = 'race' and rr.season = r.season and rr.round = r.round and rr.position = 1 limit 1) as winner
  from races r where r.series = 'f1' and r.date_utc < now()
 )
 select coalesce(jsonb_agg(to_jsonb(x) order by x.dist, x.season desc), '[]') from (
  select * from g where dist <= 3 and winner is not null order by dist, season desc limit 6
 ) x where auth.uid() is not null;
$$;
revoke all on function public.f1_on_this_day(int, int) from public, anon;
grant execute on function public.f1_on_this_day(int, int) to authenticated;
