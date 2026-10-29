// Configura somente os segredos do coletor no Vault. Nunca grava valores em disco/logs.
import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomBytes} from 'node:crypto';
if(!process.argv.includes('--apply')){console.log('Sem escrita. Use --apply após publicar sync-news para configurar Vault e executar a primeira coleta.');process.exit(0);}
const env={...(existsSync('.env')?parseEnv(readFileSync('.env','utf8')):{}),...process.env};
if(!env.SUPABASE_ACCESS_TOKEN||!env.EXPO_PUBLIC_SUPABASE_URL)throw Error('Configuração administrativa ausente.');
const base=env.EXPO_PUBLIC_SUPABASE_URL,ref=new URL(base).hostname.split('.')[0];
const api=async(path,init={})=>{const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/${path}`,{...init,headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'}});if(!r.ok)throw Error(`Configuração da coleta falhou (HTTP ${r.status}).`);const text=await r.text();return text?JSON.parse(text):null;};
const sql=query=>api('database/query',{method:'POST',body:JSON.stringify({query})});
const key=(await api('api-keys?reveal=true')).find(k=>k.name==='service_role')?.api_key;if(!key)throw Error('Credencial de serviço indisponível.');
const cronSecret=randomBytes(32).toString('base64url');
await api('secrets',{method:'POST',body:JSON.stringify([{name:'CONTENT_SYNC_SECRET',value:cronSecret}])});
const secrets=await sql("select id,name from vault.secrets where name in ('content_project_url','content_service_role','content_cron_secret')");
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
for(const[name,value]of[['content_project_url',base],['content_service_role',key],['content_cron_secret',cronSecret]]){
 const existing=secrets.find(s=>s.name===name);
 if(existing)await sql(`select vault.update_secret(${literal(existing.id)}::uuid,${literal(value)},${literal(name)},'Coletor RSS F1; acesso apenas pelo servidor')`);
 else await sql(`select vault.create_secret(${literal(value)},${literal(name)},'Coletor RSS F1; acesso apenas pelo servidor')`);
}
console.log('Segredos do coletor configurados no Vault. Nenhum valor foi registrado.');
const response=await fetch(base+'/functions/v1/sync-news',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','X-Content-Sync-Secret':cronSecret},body:'{}',signal:AbortSignal.timeout(65000)});
if(![200,202,207].includes(response.status))throw Error(`Coleta inicial falhou (HTTP ${response.status}).`);
console.log(JSON.stringify({initialCollectionStatus:response.status,result:await response.json()}));
