-- Exclusão definitiva: filhos (membros, perguntas, palpites e apurações)
-- já possuem ON DELETE CASCADE. Somente o proprietário pode excluir.
create policy "pools: owner delete" on public.pools
  for delete to authenticated using (owner_id = auth.uid());

-- Ranking da comunidade inteira, inclusive bolões dos quais o chamador não
-- participa. Expõe apenas os agregados, sem abrir acesso aos palpites privados.
create function public.global_standings()
returns table (
  user_id uuid, name text, avatar text, total bigint,
  pools_played bigint, races_scored bigint, rank bigint
)
language sql stable security definer set search_path = public as $$
  with totals as (
    select s.user_id, s.name, s.avatar,
           sum(s.total)::bigint as total,
           count(*) as pools_played,
           sum(s.races_scored)::bigint as races_scored
    from public.pool_standings s
    where auth.uid() is not null
    group by s.user_id, s.name, s.avatar
  )
  select t.*, rank() over (order by t.total desc) as rank
  from totals t
  order by t.total desc, t.name, t.user_id;
$$;

revoke all on function public.global_standings() from public, anon;
grant execute on function public.global_standings() to authenticated;
