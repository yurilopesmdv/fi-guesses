import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNewsFeed,canonicalNewsUrl,readFeedResponse} from '../supabase/functions/_shared/news-feed.ts';
import {createNewsHandler} from '../supabase/functions/_shared/news-handler.ts';
const now=Date.parse('2026-10-29T18:00:00Z');
const feed=(items,ttl='10')=>`<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><ttl>${ttl}</ttl>${items}</channel></rss>`;
const item=(url='https://motorsport.uol.com.br/f1/news/teste/1/?utm_source=RSS',date='Thu, 29 Oct 2026 12:00:00 GMT')=>`<item><title><![CDATA[F1: teste &amp; pista]]></title><link>${url.replaceAll('&','&amp;')}</link><pubDate>${date}</pubDate><description><![CDATA[<p>Resumo &quot;curto&quot;.</p><br>Leia também: texto relacionado]]></description><content:encoded><![CDATA[CORPO INTEGRAL QUE NÃO DEVE ENTRAR]]></content:encoded></item>`;
test('RSS mantém resumo e data reais, remove rastreamento e deduplica sem importar corpo',()=>{
 const {posts,ttl}=parseNewsFeed(feed(item()+item(),'100'),'motorsport-br',now);assert.equal(posts.length,1);assert.equal(ttl,100);assert.equal(posts[0].title,'F1: teste & pista');assert.equal(posts[0].summary,'Resumo "curto".');assert.equal(posts[0].url,'https://motorsport.uol.com.br/f1/news/teste/1/');assert.equal(posts[0].published_at,'2026-10-29T12:00:00.000Z');
});
test('RSS rejeita DTD, XML inválido, respostas enormes, URLs externas, datas futuras e outras categorias',async()=>{
 assert.throws(()=>parseNewsFeed('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>','motorsport-br',now));
 assert.throws(()=>parseNewsFeed('<rss><channel>','motorsport-br',now));assert.throws(()=>parseNewsFeed('x'.repeat(2_000_001),'motorsport-br',now));
 const invalid=item('https://example.test/f1/news/')+item('https://motorsport.uol.com.br/motogp/news/x')+item(undefined,'Fri, 30 Oct 2026 12:00:00 GMT');assert.equal(parseNewsFeed(feed(invalid),'motorsport-br',now).posts.length,0);
 assert.equal(canonicalNewsUrl('https://user:pass@motorsport.uol.com.br/f1/news/','motorsport-br'),null);
 await assert.rejects(readFeedResponse(new Response('x'.repeat(2_000_001))),/limite/);
});
function fakeDB(){const writes=[],calls=[];let locked=false;const sources=[{id:'motorsport-br',name:'Motorsport',feed_url:'https://motorsport.uol.com.br/rss/f1/news/',ttl_minutes:10},{id:'grande-premio',name:'Grande Prêmio',feed_url:'https://grandepremio.com/br/f1/feed/',ttl_minutes:10}];return {writes,calls,setLocked:()=>{locked=true;},async rpc(name,args){calls.push([name,args]);return {data:name==='acquire_content_sync'?!locked:null,error:null};},from(table){return{select(){return{eq:async()=>({data:sources,error:null})};},update(data){return{eq:async(_,id)=>{writes.push({table,id,data});return{error:null};}};},async upsert(data){writes.push({table,data});return{error:null};},delete(){return{eq(){return{lt:async()=>({error:null})};}};}};}};}
test('coletor exige credencial administrativa antes de iniciar consultas e respeita lease',async()=>{
 const db=fakeDB(),handler=createNewsHandler(db,'server-only-key');assert.equal((await handler(new Request('https://example.test',{method:'POST'}))).status,403);assert.equal(db.calls.length,0);db.setLocked();assert.equal((await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer server-only-key'}}))).status,202);assert.equal(db.writes.length,0);
});
test('falha de uma fonte preserva outra coleta e libera lease; 304 mantém conteúdo',async()=>{
 const db=fakeDB();let n=0;const handler=createNewsHandler(db,'server-only-key',async()=>++n===1?new Response('falha',{status:503}):new Response(null,{status:304}));const r=await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer server-only-key'}}));assert.equal(r.status,207);assert.equal(n,2);assert(db.writes.some(w=>w.id==='motorsport-br'&&w.data.last_error.includes('503')));assert(db.writes.some(w=>w.id==='grande-premio'&&w.data.last_error===null));assert.equal(db.writes.filter(w=>w.table==='content_posts').length,0);assert.equal(db.calls.at(-1)[0],'release_content_sync');
});
test('coletor publica somente itens normalizados, com IDs estáveis e metadados da fonte',async()=>{
 const db=fakeDB(),date=new Date(Date.now()-3600000).toUTCString();
 const handler=createNewsHandler(db,'server-only-key',async url=>new Response(feed(item(String(url).includes('motorsport')?'https://motorsport.uol.com.br/f1/news/teste/1/':'https://grandepremio.com/br/f1/teste/',date))));
 const r=await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer server-only-key'}}));assert.equal(r.status,200);
 const posts=db.writes.filter(w=>w.table==='content_posts').flatMap(w=>w.data);assert.equal(posts.length,2);assert(posts.every(p=>p.published&&p.language==='pt-BR'&&p.kind==='news'&&/^rss-[a-f0-9]{64}$/.test(p.id)));assert.deepEqual(posts.map(p=>p.source_id),['motorsport-br','grande-premio']);assert(posts.every(p=>p.summary==='Resumo "curto".'));
});
