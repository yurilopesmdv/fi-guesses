-- Fora do calendário consultado não significa circuito desativado definitivamente.
create function public.circuit_archive(p_current_season integer) returns setof jsonb
language sql stable security invoker set search_path = public as $$
  select (p.value - 'winners' - 'media' - 'calendar') || jsonb_build_object(
    'cover', (select to_jsonb(m) from circuit_media m where m.circuit_id=c.id and m.kind='photo' and m.published order by m.sort_order,m.id limit 1),
    'map', (select to_jsonb(m) from circuit_media m where m.circuit_id=c.id and m.kind='map' and m.published order by m.layout_season desc nulls last,m.sort_order,m.id limit 1),
    'calendar', '[]'::jsonb
  ) from circuits c cross join lateral (select circuit_profile(c.id) as value) p
  where c.published and exists (select 1 from circuit_race_winners w where w.circuit_id=c.id)
    and not exists (select 1 from circuit_seasons s where s.circuit_id=c.id and s.season=p_current_season)
  order by c.country,c.name,c.id;
$$;
revoke all on function public.circuit_archive(integer) from public,anon;
grant execute on function public.circuit_archive(integer) to authenticated;
