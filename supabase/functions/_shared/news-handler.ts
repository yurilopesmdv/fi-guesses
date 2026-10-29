import type { SupabaseClient } from '@supabase/supabase-js';
import { NEWS_SOURCES, parseNewsFeed, readFeedResponse, type NewsSource } from './news-feed.ts';
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const check=(error:unknown)=>{if(error)throw Error('Falha ao persistir a coleta.');};
export function createNewsHandler(db: Pick<SupabaseClient, 'rpc' | 'from'>, serviceKey: string, fetcher: typeof fetch = fetch) {
 return async (request: Request) => {
 if(request.method!=='POST')return reply(405,{error:'Use POST.'});
 if(!serviceKey||request.headers.get('Authorization')!==`Bearer ${serviceKey}`)return reply(403,{error:'Coleta restrita ao servidor.'});
 const owner=crypto.randomUUID(),lease=await db.rpc('acquire_content_sync',{p_owner:owner});
 if(lease.error)return reply(500,{error:'Não foi possível iniciar a coleta.'});
 if(!lease.data)return reply(202,{status:'already_running'});
 const results:Record<string,string|number>[]=[];
 try{
  const {data:sources,error}=await db.from('content_sources').select('*').eq('enabled',true);check(error);
  for(const source of sources??[]){
   const id=source.id as NewsSource,config=NEWS_SOURCES[id];if(!config)continue;
   if(source.next_fetch_at&&Date.parse(source.next_fetch_at)>Date.now())continue;
   const stamp=new Date().toISOString();
   try{
    if(source.feed_url!==config.url)throw Error('URL fora da seleção de fontes.');
    const headers:Record<string,string>={Accept:'application/rss+xml,application/xml,text/xml','User-Agent':'BolaoF1News/1.0 (+https://bolao-f1.expo.app)'};
    if(source.etag)headers['If-None-Match']=source.etag;if(source.last_modified)headers['If-Modified-Since']=source.last_modified;
    const response=await fetcher(config.url,{headers,signal:AbortSignal.timeout(20000),redirect:'error'});
    if(response.status===304){const r=await db.from('content_sources').update({checked_at:stamp,succeeded_at:stamp,last_error:null,next_fetch_at:new Date(Date.now()+source.ttl_minutes*60000).toISOString()}).eq('id',id);check(r.error);results.push({source:id,status:'unchanged'});continue;}
    if(!response.ok)throw Error(`Fonte respondeu HTTP ${response.status}.`);
    const parsed=parseNewsFeed(await readFeedResponse(response),id);
    const posts=await Promise.all(parsed.posts.map(async post=>{const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(post.url));return {...post,id:'rss-'+[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join(''),source_id:id,source_name:source.name,kind:'news',language:'pt-BR',published:true,updated_at:stamp};}));
    if(posts.length){const r=await db.from('content_posts').upsert(posts,{onConflict:'url'});check(r.error);}
    const r=await db.from('content_sources').update({checked_at:stamp,succeeded_at:stamp,last_error:null,item_count:posts.length,etag:response.headers.get('etag'),last_modified:response.headers.get('last-modified'),ttl_minutes:parsed.ttl,next_fetch_at:new Date(Date.now()+parsed.ttl*60000).toISOString()}).eq('id',id);check(r.error);
    results.push({source:id,status:'ok',items:posts.length});
   }catch(e){
    const message=e instanceof Error?e.message:'Falha ao consultar a fonte.';
    // Não retornar corpo remoto, headers ou credenciais em logs/status.
    const safe=/^(Fonte respondeu HTTP \d+\.|Feed |Resposta de feed|URL fora|Falha ao persistir)/.test(message)?message:'Fonte temporariamente indisponível.';
    const r=await db.from('content_sources').update({checked_at:stamp,last_error:safe,next_fetch_at:new Date(Date.now()+10*60000).toISOString()}).eq('id',id);check(r.error);
    results.push({source:id,status:'error'});
   }
  }
  const curiosity=await db.rpc('publish_circuit_curiosity');check(curiosity.error);
  const cleanup=await db.from('content_posts').delete().eq('kind','news').lt('published_at',new Date(Date.now()-45*86400000).toISOString());check(cleanup.error);
  return reply(results.some(r=>r.status==='error')?207:200,{status:'complete',sources:results});
 }catch{return reply(500,{error:'Falha na coleta. O conteúdo anterior foi preservado.'});}
 finally{await db.rpc('release_content_sync',{p_owner:owner});}
 };
}
