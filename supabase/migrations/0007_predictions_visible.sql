-- Palpites visíveis pra todos os membros do bolão o tempo todo (pedido da família)
drop policy "predictions: read" on public.predictions;
create policy "predictions: read" on public.predictions for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from questions q where q.id = question_id and is_member(q.pool_id))
);
