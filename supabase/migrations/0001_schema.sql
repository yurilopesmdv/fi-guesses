-- Bolão F1 — schema inicial. Rodar no SQL Editor do Supabase.

-- ---------- Tabelas ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar text not null default '🏎️',
  created_at timestamptz not null default now()
);

create table public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references public.profiles(id),
  season int not null,
  stake_label text,
  lock_minutes_before int not null default 0,
  created_at timestamptz not null default now()
);

create table public.pool_members (
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);
create index pool_members_user_idx on public.pool_members(user_id);

create table public.races (
  id uuid primary key default gen_random_uuid(),
  season int not null,
  round int not null,
  name text not null,
  circuit text,
  country text,
  date_utc timestamptz not null,
  has_sprint boolean not null default false,
  unique (season, round)
);

create table public.drivers (
  season int not null,
  code text not null,
  name text not null,
  number int,
  team text,
  team_color text,
  primary key (season, code)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  race_id uuid not null references public.races(id) on delete cascade,
  kind text not null check (kind in ('podium','driver','position_of_driver','yesno','text')),
  prompt text not null,
  points int not null default 3,
  near_points int not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index questions_pool_race_idx on public.questions(pool_id, race_id);
create unique index questions_one_podium_idx on public.questions(pool_id, race_id) where kind = 'podium';

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answer jsonb not null,
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);
create index predictions_user_idx on public.predictions(user_id);

create table public.results (
  question_id uuid primary key references public.questions(id) on delete cascade,
  answer jsonb not null,
  set_by uuid references public.profiles(id),
  set_at timestamptz not null default now()
);

-- ---------- Helpers ----------
create or replace function public.is_member(p_pool uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pool_members where pool_id = p_pool and user_id = auth.uid());
$$;

create or replace function public.is_owner(p_pool uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pools where id = p_pool and owner_id = auth.uid());
$$;

-- Momento em que os palpites fecham para (bolão, corrida)
create or replace function public.lock_at(p_pool uuid, p_race uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select r.date_utc - make_interval(mins => p.lock_minutes_before)
  from races r, pools p where r.id = p_race and p.id = p_pool;
$$;

create or replace function public.question_is_open(p_question uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select now() < lock_at(q.pool_id, q.race_id) from questions q where q.id = p_question;
$$;

-- ---------- Pontuação ----------
create or replace function public.score_answer(
  kind text, points int, near_points int, prediction jsonb, result jsonb, p_user uuid
) returns int language plpgsql immutable as $$
declare
  total int := 0; slot text; pred text; podium text[];
begin
  if prediction is null or result is null then return 0; end if;
  case kind
    when 'podium' then
      podium := array[result->>'p1', result->>'p2', result->>'p3'];
      foreach slot in array array['p1','p2','p3'] loop
        pred := prediction->>slot;
        if pred is null then continue; end if;
        if pred = result->>slot then total := total + 3;
        elsif pred = any(podium) then total := total + 1;
        end if;
      end loop;
    when 'driver' then
      if prediction->>'driver' = result->>'driver' then total := points; end if;
    when 'yesno' then
      if (prediction->>'v')::boolean = (result->>'v')::boolean then total := points; end if;
    when 'position_of_driver' then
      if (prediction->>'pos')::int = (result->>'pos')::int then total := points;
      elsif abs((prediction->>'pos')::int - (result->>'pos')::int) = 1 then total := near_points;
      end if;
    when 'text' then
      if result->'correct_users' ? p_user::text then total := points; end if;
  end case;
  return total;
end $$;

-- ---------- Views ----------
create view public.prediction_scores with (security_invoker = true) as
select q.pool_id, q.race_id, q.id as question_id, p.user_id,
       score_answer(q.kind, q.points, q.near_points, p.answer, r.answer, p.user_id) as points
from predictions p
join questions q on q.id = p.question_id
join results r on r.question_id = q.id;

create view public.race_scores with (security_invoker = true) as
select pool_id, race_id, user_id, sum(points)::int as points
from prediction_scores group by pool_id, race_id, user_id;

create view public.pool_standings with (security_invoker = true) as
select m.pool_id, m.user_id, pr.name, pr.avatar,
       coalesce(sum(rs.points), 0)::int as total,
       count(rs.race_id)::int as races_scored
from pool_members m
join profiles pr on pr.id = m.user_id
left join race_scores rs on rs.pool_id = m.pool_id and rs.user_id = m.user_id
group by m.pool_id, m.user_id, pr.name, pr.avatar;

-- ---------- Triggers ----------
-- Perfil criado automaticamente no signup (nome vem do metadata do OTP)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dono entra como membro + pergunta de pódio pra cada corrida da temporada
create or replace function public.handle_new_pool() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into pool_members (pool_id, user_id) values (new.id, new.owner_id);
  insert into questions (pool_id, race_id, kind, prompt, points)
  select new.id, r.id, 'podium', 'Pódio', 3 from races r where r.season = new.season;
  return new;
end $$;
create trigger on_pool_created after insert on public.pools
  for each row execute function public.handle_new_pool();

-- Corrida nova → pergunta de pódio em todos os bolões da temporada
create or replace function public.handle_new_race() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into questions (pool_id, race_id, kind, prompt, points)
  select p.id, new.id, 'podium', 'Pódio', 3 from pools p where p.season = new.season;
  return new;
end $$;
create trigger on_race_created after insert on public.races
  for each row execute function public.handle_new_race();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger predictions_touch before update on public.predictions
  for each row execute function public.touch_updated_at();

-- ---------- RPCs ----------
create or replace function public.gen_invite_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random()*31)::int + 1, 1), '')
  from generate_series(1, 6);
$$;

create or replace function public.create_pool(p_name text, p_season int, p_stake_label text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into pools (name, invite_code, owner_id, season, stake_label)
  values (p_name, gen_invite_code(), auth.uid(), p_season, p_stake_label)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.join_pool(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from pools where invite_code = upper(trim(p_code));
  if v_id is null then raise exception 'Código inválido'; end if;
  insert into pool_members (pool_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end $$;

-- Quem já palpitou (visível antes do fechamento, sem revelar o palpite)
create or replace function public.race_participation(p_pool uuid, p_race uuid)
returns table (user_id uuid, has_prediction boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id,
         exists (select 1 from predictions p join questions q on q.id = p.question_id
                 where q.pool_id = p_pool and q.race_id = p_race and q.kind = 'podium' and p.user_id = m.user_id)
  from pool_members m
  where m.pool_id = p_pool and is_member(p_pool);
$$;

-- ---------- RLS ----------
alter table profiles     enable row level security;
alter table pools        enable row level security;
alter table pool_members enable row level security;
alter table races        enable row level security;
alter table drivers      enable row level security;
alter table questions    enable row level security;
alter table predictions  enable row level security;
alter table results      enable row level security;

create policy "profiles: read all"   on profiles for select to authenticated using (true);
create policy "profiles: update own" on profiles for update to authenticated using (id = auth.uid());

create policy "pools: members read"  on pools for select to authenticated using (is_member(id));
create policy "pools: owner update"  on pools for update to authenticated using (owner_id = auth.uid());

create policy "members: read own pools" on pool_members for select to authenticated using (is_member(pool_id));
create policy "members: leave"          on pool_members for delete to authenticated using (user_id = auth.uid());

-- calendário e pilotos são globais; qualquer logado pode importar (app de família)
create policy "races: read"   on races   for select to authenticated using (true);
create policy "races: write"  on races   for all    to authenticated using (true) with check (true);
create policy "drivers: read" on drivers for select to authenticated using (true);
create policy "drivers: write" on drivers for all   to authenticated using (true) with check (true);

create policy "questions: members read" on questions for select to authenticated using (is_member(pool_id));
create policy "questions: owner write"  on questions for all to authenticated
  using (is_owner(pool_id)) with check (is_owner(pool_id));

-- palpite: o próprio sempre vê; os outros só depois do fechamento
create policy "predictions: read" on predictions for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from questions q where q.id = question_id
             and is_member(q.pool_id) and now() >= lock_at(q.pool_id, q.race_id))
);
create policy "predictions: write own while open" on predictions for insert to authenticated
  with check (user_id = auth.uid() and question_is_open(question_id)
              and exists (select 1 from questions q where q.id = question_id and is_member(q.pool_id)));
create policy "predictions: update own while open" on predictions for update to authenticated
  using (user_id = auth.uid() and question_is_open(question_id));
create policy "predictions: delete own while open" on predictions for delete to authenticated
  using (user_id = auth.uid() and question_is_open(question_id));

create policy "results: members read" on results for select to authenticated
  using (exists (select 1 from questions q where q.id = question_id and is_member(q.pool_id)));
create policy "results: owner write" on results for all to authenticated
  using  (exists (select 1 from questions q where q.id = question_id and is_owner(q.pool_id)))
  with check (exists (select 1 from questions q where q.id = question_id and is_owner(q.pool_id)));
