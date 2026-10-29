import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';

/** Publica metadados e vínculos em uma transação; só para operação administrativa. */
export async function applyCircuitBundle(bundle) {
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
}
