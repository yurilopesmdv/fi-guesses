// Prepara histórico e metadados; --refresh consulta a fonte, --apply publica o bundle.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fetchCircuitWinners} from '../src/lib/f1api.ts';
import {applyCircuitBundle} from './lib/circuit-import.mjs';
const args=new Set(process.argv.slice(2));
const config=JSON.parse(readFileSync('data/circuits/archive-catalog.json','utf8'));
const target='data/circuits/import-archive.json';
let previous=existsSync(target)?JSON.parse(readFileSync(target,'utf8')):null;
if(!args.has('--apply')||args.has('--refresh')){
 const stamp=new Date().toISOString();
 const bundle={prepared_at:stamp,circuits:[],circuit_seasons:[],circuit_layouts:[],circuit_race_winners:[],circuit_imports:[],circuit_media:[]};
 for(const row of config.circuits){
  const winners=args.has('--refresh')||!previous?await fetchCircuitWinners(row.id):previous.circuit_race_winners.filter(w=>w.circuit_id===row.id);
  if(!winners.length)throw Error(`Histórico indisponível: ${row.id}`);
  const {layout,f1db_id,f1db_layout_id,...circuit}=row;bundle.circuits.push({...circuit,updated_at:stamp});bundle.circuit_layouts.push({circuit_id:row.id,...layout});bundle.circuit_race_winners.push(...winners);
  const editions=new Map(winners.map(w=>[`${w.season}:${w.round}`,{circuit_id:row.id,season:w.season,round:w.round,race_name:w.race_name,date_utc:w.date_utc}]));bundle.circuit_seasons.push(...editions.values());
  const old=previous?.circuit_imports.find(i=>i.circuit_id===row.id);
  bundle.circuit_imports.push({circuit_id:row.id,results_complete:true,synced_at:args.has('--refresh')||!old?stamp:old.synced_at,source_url:`https://api.jolpi.ca/ergast/f1/circuits/${encodeURIComponent(row.id)}/results/1.json`});
 }
 writeFileSync(target,JSON.stringify(bundle,null,2)+'\n');console.log(`${bundle.circuits.length} pistas históricas preparadas. Nenhuma escrita remota.`);
}
if(args.has('--apply')){
 const bundle=JSON.parse(readFileSync(target,'utf8'));
 if(bundle.circuits.length!==config.circuits.length)throw Error('Acervo incompleto.');
 if(bundle.circuit_media.length)throw Error('Mídia histórica exige seleção oficial própria; importação de dados não publica imagens.');
 await applyCircuitBundle(bundle);console.log(`Publicado: ${bundle.circuits.length} pistas históricas e ${bundle.circuit_media.length} mídias.`);
}
