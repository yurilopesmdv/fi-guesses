// --apply cria bucket público e envia arquivos curados. Sem flag, só valida o acervo local.
import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
const rows=JSON.parse(readFileSync('data/circuits/prepared-media.json','utf8'));
const paths=[...new Set(rows.flatMap((row)=>[row.storage_path,row.thumbnail_path]).filter(path=>!path.startsWith('https://media.formula1.com/')))];
if(!paths.length){console.log('Traçados servidos diretamente pela fonte oficial; nenhum upload necessário.');process.exit(0);}
for(const path of paths)if(!existsSync(`/tmp/bolao-f1-circuit-media/${path}`))throw new Error(`Arquivo local ausente: ${path}`);
if(!process.argv.includes('--apply')){console.log(`${paths.length} arquivos locais validados. Use --apply para enviar.`);process.exit(0);}
const env={...(existsSync('.env')?parseEnv(readFileSync('.env','utf8')):{}),...process.env};
const base=env.EXPO_PUBLIC_SUPABASE_URL;
if(!base||!env.SUPABASE_ACCESS_TOKEN)throw new Error('Configuração administrativa ausente.');
const ref=new URL(base).hostname.split('.')[0];
const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`,{headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`}});
if(!response.ok)throw new Error(`Credencial administrativa indisponível (${response.status}).`);
const key=(await response.json()).find(k=>k.name==='service_role')?.api_key;
if(!key)throw new Error('Chave de serviço ausente.');
const headers={Authorization:`Bearer ${key}`,apikey:key};
let bucket=await fetch(`${base}/storage/v1/bucket/circuits`,{headers});
if(bucket.status===404 || bucket.status===400){bucket=await fetch(`${base}/storage/v1/bucket`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:'circuits',name:'circuits',public:true,file_size_limit:10*1024*1024,allowed_mime_types:['image/webp']})});if(!bucket.ok)throw new Error(`Não foi possível criar bucket (${bucket.status}).`);}
else if(!bucket.ok)throw new Error(`Não foi possível consultar bucket (${bucket.status}).`);
for(const path of paths){
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const check=await fetch(`${base}/storage/v1/object/public/circuits/${encoded}`,{method:'HEAD'});
  if(check.ok)continue;
  const r=await fetch(`${base}/storage/v1/object/circuits/${encoded}`,{method:'POST',headers:{...headers,'Content-Type':'image/webp','Cache-Control':'public,max-age=31536000,immutable','x-upsert':'false'},body:readFileSync(`/tmp/bolao-f1-circuit-media/${path}`)});
  if(!r.ok)throw new Error(`Falha no envio de ${path} (${r.status}).`);
  console.log(`Enviado: ${path}`);
}
console.log(`${paths.length} arquivos disponíveis; apenas backend possui permissão de upload.`);
