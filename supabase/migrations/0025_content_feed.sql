-- Notícias F1 em português. O aplicativo apenas lê conteúdo publicado.
create table public.content_sources (
 id text primary key, name text not null, feed_url text not null check(feed_url like 'https://%'),
 site_url text not null check(site_url like 'https://%'), enabled boolean not null default true,
 etag text, last_modified text, ttl_minutes integer not null default 10, next_fetch_at timestamptz, checked_at timestamptz, succeeded_at timestamptz,
 last_error text, item_count integer not null default 0
);
create table public.content_posts (
 id text primary key, kind text not null check(kind in ('news','curiosity')),
 title text not null check(length(title) between 1 and 300), summary text not null check(length(summary)<=500),
 url text not null unique check(url like 'https://%'), source_id text references public.content_sources(id),
 source_name text not null, author text, language text not null default 'pt-BR' check(language='pt-BR'),
 circuit_id text references public.circuits(id), published boolean not null default false,
 published_at timestamptz not null, collected_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index content_posts_feed on public.content_posts(published_at desc,id desc) where published;
create table public.content_sync_state(id text primary key, owner uuid, lease_until timestamptz);
insert into public.content_sync_state(id) values('rss');
alter table public.content_sources enable row level security;
alter table public.content_posts enable row level security;
alter table public.content_sync_state enable row level security;
create policy content_sources_read on public.content_sources for select to authenticated using(auth.uid() is not null and enabled);
create policy content_posts_read on public.content_posts for select to authenticated using(auth.uid() is not null and published and published_at<=now());
revoke all on public.content_sources,public.content_posts,public.content_sync_state from anon,authenticated;
grant select on public.content_sources,public.content_posts to authenticated;
grant all on public.content_sources,public.content_posts,public.content_sync_state to service_role;
insert into public.content_sources(id,name,feed_url,site_url) values
 ('motorsport-br','Motorsport.com Brasil','https://motorsport.uol.com.br/rss/f1/news/','https://motorsport.uol.com.br/f1/'),
 ('grande-premio','Grande Prêmio','https://grandepremio.com/br/f1/feed/','https://grandepremio.com/br/f1/');

create function public.acquire_content_sync(p_owner uuid) returns boolean
language sql security definer set search_path=public as $$
 with acquired as (update content_sync_state set owner=p_owner,lease_until=now()+interval '5 minutes'
 where id='rss' and (lease_until is null or lease_until<now()) returning 1) select exists(select 1 from acquired);
$$;
create function public.release_content_sync(p_owner uuid) returns void
language sql security definer set search_path=public as $$
 update content_sync_state set owner=null,lease_until=null where id='rss' and owner=p_owner;
$$;
revoke all on function public.acquire_content_sync(uuid),public.release_content_sync(uuid) from public,anon,authenticated;
grant execute on function public.acquire_content_sync(uuid),public.release_content_sync(uuid) to service_role;

-- Conteúdo próprio baseado em estatísticas: uma curiosidade de pista por dia.
create function public.publish_circuit_curiosity() returns void
language plpgsql security definer set search_path=public as $$
declare c record; p jsonb; s jsonb; day integer; stamp timestamptz;
begin
 stamp:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 day:=floor(extract(epoch from stamp)/86400)::integer;
 select * into c from circuits where published and official_url like 'https://www.formula1.com/%'
 order by id offset mod(day,greatest(1,(select count(*) from circuits where published and official_url like 'https://www.formula1.com/%'))::integer) limit 1;
 if c.id is null then return;end if;
 p:=circuit_profile(c.id);s:=p->'stats';
 if not coalesce((s->>'complete')::boolean,false) or (s->>'races')::integer=0 then return;end if;
 insert into content_posts(id,kind,title,summary,url,source_name,circuit_id,published,published_at)
 values('circuit-fact-'||to_char(stamp at time zone 'America/Sao_Paulo','YYYY-MM-DD'),'curiosity',c.name||': um circuito em números',
 format('Desde %s, esta pista recebeu %s %s do Mundial em %s %s, com %s %s. Os totais contam corridas principais; sprints ficam fora. Consulte o perfil para conhecer os maiores vencedores.',s->>'first_season',s->>'races',case when s->>'races'='1' then 'corrida' else 'corridas' end,s->>'seasons',case when s->>'seasons'='1' then 'temporada' else 'temporadas' end,s->>'different_winners',case when s->>'different_winners'='1' then 'vencedor' else 'vencedores diferentes' end),
 'https://bolao-f1.expo.app/circuit/'||c.id||'?curiosidade='||to_char(stamp at time zone 'America/Sao_Paulo','YYYY-MM-DD'),'Acervo Bolão F1 · dados Jolpica',c.id,true,stamp)
 on conflict(id) do update set summary=excluded.summary,updated_at=now();
end $$;
revoke all on function public.publish_circuit_curiosity() from public,anon,authenticated;
grant execute on function public.publish_circuit_curiosity() to service_role;
