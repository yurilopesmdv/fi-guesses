import assert from 'node:assert/strict';
import { test } from 'node:test';
import { poolStatusDescription, poolStatusLabel, sortPools } from '../src/lib/poolStatus.ts';

test('lista destaca andamento e ordena criação recente em ambos os grupos sem alterar entrada', () => {
  const pools = ['finished-old','ongoing-old','finished-new','ongoing-new'].map((id)=>({id}));
  const states = Object.fromEntries(pools.map((p)=>[p.id,{status:p.id.startsWith('finished')?'finished':'ongoing',created_at:p.id.endsWith('new')?'2026-10-16T10:00:00Z':'2026-10-15T10:00:00Z'}]));
  assert.deepEqual(sortPools(pools,states).map((p)=>p.id),['ongoing-new','ongoing-old','finished-new','finished-old']);
  assert.equal(pools[0].id,'finished-old');
});

test('status distingue finalizado, apuração pendente e calendário ausente', () => {
  assert.equal(poolStatusLabel({status:'finished'}),'Finalizado');
  assert.equal(poolStatusLabel({status:'ongoing'}),'Em andamento');
  assert.match(poolStatusDescription({status:'ongoing',has_races:true,pending_results:1}),/1 resultado pendente/);
  assert.equal(poolStatusDescription({status:'ongoing',has_races:false}),'Aguardando calendário.');
  assert.equal(poolStatusLabel(null),'Atualizando status');
});
