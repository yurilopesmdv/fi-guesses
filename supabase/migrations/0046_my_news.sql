-- Notícias para você (P07): pista vinculada ou menção (palavra inteira) ao sobrenome do piloto / nome da equipe que o usuário segue.
-- Filtro opcional; o feed geral não muda. Sem tags editoriais: menções podem trazer falsos positivos e são rotuladas assim na UI.
create function public.my_news(p_offset int default 0) returns table (id text, kind text, title text, summary text, url text, source_name text, author text, circuit_id text, published_at timestamptz)
language sql stable security invoker set search_path = public as $$
 with f as (select kind, entity_id from follows where user_id = auth.uid()),
 terms as (
  select (select regexp_replace(split_part(d.name, ' ', array_length(string_to_array(d.name, ' '), 1)), '([^[:alnum:] ])', '\\\1', 'g')
    from drivers d where d.series = 'f1' and d.driver_id = f.entity_id order by d.season desc limit 1) as t from f where f.kind = 'driver'
  union all
  select (select regexp_replace(x.team, '([^[:alnum:] ])', '\\\1', 'g') from drivers x where x.series = 'f1' and x.constructor_id = f.entity_id and x.team is not null order by x.season desc limit 1)
   from f where f.kind = 'team'
 ), pattern as (select '\m(' || string_agg(t, '|') || ')\M' as p from terms where length(t) >= 3)
 select c.id, c.kind, c.title, c.summary, c.url, c.source_name, c.author, c.circuit_id, c.published_at
 from content_posts c
 where c.published and c.published_at <= now() and auth.uid() is not null
   and (c.circuit_id in (select entity_id from f where kind = 'circuit')
     or ((select p from pattern) is not null and (c.title || ' ' || c.summary) ~* (select p from pattern)))
 order by c.published_at desc, c.id desc
 offset greatest(p_offset, 0) limit 20;
$$;
revoke all on function public.my_news(int) from public, anon;
grant execute on function public.my_news(int) to authenticated;
