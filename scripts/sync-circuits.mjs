// Prepara o catálogo sem escrever no serviço. --apply publica o bundle preparado.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fetchCircuitCalendar, fetchCircuitWinners } from '../src/lib/f1api.ts';

const args=new Set(process.argv.slice(2));
const season=Number(process.argv.find((v)=>/^20\d\d$/.test(v))??new Date().getFullYear());
if(!Number.isInteger(season)||season<1950)throw new Error('Temporada inválida.');
const config=JSON.parse(readFileSync(`data/circuits/catalog-${season}.json`,'utf8'));
const target=`data/circuits/import-${season}.json`;
if(args.has('--metadata-only')){
  const bundle=JSON.parse(readFileSync(target,'utf8'));
  bundle.circuits=bundle.circuits.map((c)=>{const row=config.circuits.find(r=>r.id===c.id);return {...c,name:row.name,description:row.description,official_url:row.official_url};});
  bundle.circuit_layouts=config.circuits.map(c=>({circuit_id:c.id,...c.layout}));
  bundle.circuit_media=JSON.parse(readFileSync('data/circuits/prepared-media.json','utf8'));
  writeFileSync(target,JSON.stringify(bundle,null,2)+'\n');
  console.log('Metadados atualizados no bundle local. Nenhuma escrita remota.');process.exit(0);
}
if(!args.has('--apply') || args.has('--refresh')){
  const calendar=await fetchCircuitCalendar(season);
  const prepared=existsSync('data/circuits/prepared-media.json')?JSON.parse(readFileSync('data/circuits/prepared-media.json','utf8')):[];
  const bundle={season,prepared_at:new Date().toISOString(),circuits:[],circuit_seasons:[],circuit_layouts:[],circuit_race_winners:[],circuit_imports:[],circuit_media:prepared};
  for(const {circuit,event} of calendar){
    const editorial=config.circuits.find((row)=>row.id===circuit.id);
    if(!editorial)throw new Error(`A pista ${circuit.id} ainda não tem curadoria. Catálogo não será publicado parcialmente.`);
    if(bundle.circuits.some((row)=>row.id===circuit.id)){bundle.circuit_seasons.push(event);continue;}
    const winners=await fetchCircuitWinners(circuit.id);
    bundle.circuits.push({...circuit,name:editorial.name,description:editorial.description,official_url:editorial.official_url,published:true,updated_at:bundle.prepared_at});
    bundle.circuit_layouts.push({circuit_id:circuit.id,...editorial.layout});
    bundle.circuit_seasons.push(event);
    bundle.circuit_race_winners.push(...winners);
    bundle.circuit_imports.push({circuit_id:circuit.id,results_complete:true,synced_at:bundle.prepared_at,source_url:`https://api.jolpi.ca/ergast/f1/circuits/${encodeURIComponent(circuit.id)}/results/1.json`});
    console.log(`${circuit.id}: ${winners.length} registros de vencedores.`);
  }
  writeFileSync(target,JSON.stringify(bundle,null,2)+'\n');
  console.log(`Preparado: ${target}. Nenhuma escrita remota.`);
}
if(args.has('--apply')){
  const bundle=JSON.parse(readFileSync(target,'utf8'));
  if(bundle.season!==season||!bundle.circuits.length)throw new Error('Bundle inválido.');
  for(const circuit of bundle.circuits){
    const maps=bundle.circuit_media.filter((m)=>m.circuit_id===circuit.id&&m.kind==='map'&&m.published);
    if(maps.length!==1||!maps.every(m=>m.storage_path.startsWith('https://media.formula1.com/')))throw new Error(`${circuit.id}: exige exatamente um traçado da fonte oficial.`);
  }
  const env={...(existsSync('.env')?parseEnv(readFileSync('.env','utf8')):{}),...process.env};
  if(!env.EXPO_PUBLIC_SUPABASE_URL||!env.SUPABASE_ACCESS_TOKEN)throw new Error('Configuração administrativa ausente.');
  const ref=new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  const schema={circuits:['id'],circuit_seasons:['season','round'],circuit_layouts:['circuit_id','season'],circuit_race_winners:['circuit_id','season','round','driver_id'],circuit_imports:['circuit_id'],circuit_media:['id']};
  const literal=(v)=>`'${String(v).replaceAll("'","''")}'`;
  const statements=Object.entries(schema).map(([table,keys])=>{
    const rows=bundle[table];if(!rows.length)return '';
    const columns=Object.keys(rows[0]);
    if(!columns.every((c)=>/^[a-z_]+$/.test(c)))throw new Error('Coluna inválida no bundle.');
    return `insert into public.${table} (${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::public.${table},${literal(JSON.stringify(rows))}::jsonb) on conflict(${keys.join(',')}) do update set ${columns.filter((c)=>!keys.includes(c)).map((c)=>`${c}=excluded.${c}`).join(',')};`;
  });
  statements.push(`update public.races r set circuit_id=s.circuit_id from public.circuit_seasons s where r.series='f1' and r.season=s.season and r.round=s.round;`);
  // Associa também edições antigas já existentes, com base na identidade importada da fonte.
  statements.push(`update public.races r set circuit_id=w.circuit_id from public.circuit_race_winners w where r.series='f1' and r.season=w.season and r.round=w.round;`);
  const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:`begin;${statements.join('\n')}commit;`})});
  if(!response.ok)throw new Error(`Importação de pistas falhou (${response.status}): ${(await response.text()).slice(0,500)}`);
  console.log(`Publicado: ${bundle.circuits.length} pistas, ${bundle.circuit_media.length} mídias e ${bundle.circuit_race_winners.length} vencedores.`);
}
