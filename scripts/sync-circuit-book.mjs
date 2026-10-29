// Publica somente fotos revisadas de trechos do traçado F1. Sem --apply, valida apenas o manifesto.
import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
const rows=JSON.parse(readFileSync('data/circuits/track-book.json','utf8'));
const circuits=new Set(JSON.parse(readFileSync('data/circuits/catalog-2026.json','utf8')).circuits.map(c=>c.id));
const ids=new Set();
for(const row of rows){
 const r=row.review;
 if(ids.has(row.id)||!row.id.includes('-book-')||!circuits.has(row.circuit_id)||row.kind!=='photo'||!row.section_title||!row.section_description)throw Error(`Identidade/trecho inválido: ${row.id}`);
 ids.add(row.id);
 if(!r?.f1_layout||!['none','f1'].includes(r.visible_cars)||!r.track_is_primary_subject||!r.people_are_not_subject||!r.not_distant_tourism||!r.source_official||!r.visually_reviewed)throw Error(`Curadoria F1 incompleta: ${row.id}`);
 if(row.width<600||row.height<400||!row.author||!row.license||!row.published)throw Error(`Qualidade/créditos incompletos: ${row.id}`);
 for(const field of ['storage_path','thumbnail_path','source_url','license_url'])if(!row[field]?.startsWith('https://'))throw Error(`URL inválida: ${row.id}/${field}`);
 if(!r.f1_reference_url?.startsWith('https://www.formula1.com/'))throw Error(`Referência F1 ausente: ${row.id}`);
}
console.log(`${rows.length} fotos revisadas de ${new Set(rows.map(r=>r.circuit_id)).size} pistas. Nenhuma foto de outra categoria.`);
if(!process.argv.includes('--apply'))process.exit(0);
const env={...(existsSync('.env')?parseEnv(readFileSync('.env','utf8')):{}),...process.env};
if(!env.SUPABASE_ACCESS_TOKEN||!env.EXPO_PUBLIC_SUPABASE_URL)throw Error('Configuração administrativa ausente.');
const ref=new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const data=rows.map(({review,...row})=>row),columns=Object.keys(data[0]);
const literal="'"+JSON.stringify(data).replaceAll("'","''")+"'::jsonb";
const query=`begin;update public.circuit_media set published=false where kind='photo';insert into public.circuit_media (${columns.join(',')}) select ${columns.join(',')} from jsonb_populate_recordset(null::public.circuit_media,${literal}) on conflict(id) do update set ${columns.filter(k=>k!=='id').map(k=>`${k}=excluded.${k}`).join(',')};commit;`;
const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
if(!response.ok)throw Error(`Publicação do book falhou (${response.status}).`);
console.log('Book publicado. Mapas, indicadores e demais dados preservados.');
