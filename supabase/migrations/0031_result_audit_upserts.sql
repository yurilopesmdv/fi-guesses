-- BEFORE INSERT também executa na tentativa que vira UPDATE por ON CONFLICT.
-- A auditoria deve registrar apenas a operação efetivamente gravada.
create or replace function public.audit_result_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' or new.answer is distinct from old.answer then
 insert into result_history(pool_id,race_id,question_id,question_prompt,previous_answer,answer,actor_id)
 select q.pool_id,q.race_id,q.id,q.prompt,case when tg_op='UPDATE' then old.answer else null end,new.answer,auth.uid() from questions q where q.id=new.question_id;
 end if;
 return new;
end $$;
drop trigger results_audit on public.results;
create trigger results_audit after insert or update on public.results for each row execute function public.audit_result_change();
create function public.touch_result_apuration_time() returns trigger language plpgsql set search_path=public as $$
begin if new.answer is distinct from old.answer then new.set_at:=now();end if;return new;end $$;
create trigger results_touch_apuration before update on public.results for each row execute function public.touch_result_apuration_time();
