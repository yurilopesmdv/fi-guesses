import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circuitDirection, circuitLength, filterCircuits, nextCircuit } from '../src/lib/circuits.ts';
const rows=[{circuit:{id:'interlagos',name:'Autódromo José Carlos Pace',country:'Brazil',locality:'São Paulo'},calendar:[{date_utc:'2026-11-08T17:00:00Z'}]},{circuit:{id:'suzuka',name:'Suzuka',country:'Japan',locality:'Suzuka'},calendar:[{date_utc:'2026-03-29T05:00:00Z'}]}];
test('busca de pistas ignora acentos e combina cidade e nome',()=>{
  assert.equal(filterCircuits(rows,'sao pace')[0].circuit.id,'interlagos');
  assert.equal(filterCircuits(rows,'Brasil')[0].circuit.id,'interlagos');
  assert.equal(filterCircuits(rows,'SUZUKA')[0].circuit.id,'suzuka');
  assert.equal(filterCircuits(rows,'inexistente').length,0);
});
test('próxima pista vem de GP futuro e não da ordem de entrada',()=>{
  assert.equal(nextCircuit(rows,Date.parse('2026-02-01')),'suzuka');
  assert.equal(nextCircuit(rows,Date.parse('2026-10-28')),'interlagos');
  assert.equal(nextCircuit(rows,Date.parse('2027-01-01')),null);
  assert.equal(circuitLength(4309),'4,309 km');
  assert.equal(circuitDirection('figure_eight'),'Em oito');
});
