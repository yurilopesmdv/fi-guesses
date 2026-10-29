-- Adição opcional. Toda pergunta existente continua fechando antes da corrida.
alter table public.questions add column session text not null default 'race' check(session in ('race','qualifying','sprint'));
alter table public.questions add constraint optional_session_extras_only check(session='race' or kind<>'podium');
create function public.question_lock_at(p_question uuid) returns timestamptz language sql stable security definer set search_path=public as $$
 select case q.session when 'qualifying' then r.quali_utc when 'sprint' then r.sprint_utc else r.date_utc end - make_interval(mins=>p.lock_minutes_before)
 from questions q join races r on r.id=q.race_id join pools p on p.id=q.pool_id where q.id=p_question;
$$;
create or replace function public.question_is_open(p_question uuid) returns boolean language sql stable security definer set search_path=public as $$select coalesce(now()<question_lock_at(p_question),false)$$;
create function public.validate_question_session() returns trigger language plpgsql set search_path=public as $$
begin
 if new.session<>'race' and not exists(select 1 from races r where r.id=new.race_id and r.series='f1' and case new.session when 'qualifying' then r.quali_utc is not null else r.has_sprint and r.sprint_utc is not null end) then raise exception 'Esta sessão não tem programação disponível.';end if;
 return new;
end $$;
create trigger question_session_valid before insert or update on public.questions for each row execute function public.validate_question_session();

create table public.result_history(
 id uuid primary key default gen_random_uuid(),pool_id uuid not null references pools(id) on delete cascade,
 race_id uuid not null references races(id) on delete cascade,question_id uuid references questions(id) on delete set null,question_prompt text not null,
 previous_answer jsonb,answer jsonb not null,actor_id uuid references profiles(id) on delete set null,changed_at timestamptz not null default now()
);
alter table public.result_history enable row level security;
create policy result_history_read on public.result_history for select to authenticated using(is_member(pool_id));
revoke all on public.result_history from public,anon,authenticated;
grant select on public.result_history to authenticated;
create function public.audit_result_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' or new.answer is distinct from old.answer then
 new.set_at:=now();
 insert into result_history(pool_id,race_id,question_id,question_prompt,previous_answer,answer,actor_id)
 select q.pool_id,q.race_id,q.id,q.prompt,case when tg_op='UPDATE' then old.answer else null end,new.answer,auth.uid() from questions q where q.id=new.question_id;
 end if;
 return new;
end $$;
create trigger results_audit before insert or update on public.results for each row execute function public.audit_result_change();

revoke all on function public.question_lock_at(uuid) from public,anon;
grant execute on function public.question_lock_at(uuid) to authenticated,service_role;
