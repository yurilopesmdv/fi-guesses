import type { Answer } from './types';
export type PendingPrediction = { questionId:string; answer:Answer; deadline:string; version:string; status:'pending'|'failed'|'expired'; error?:string };
type Options={read:()=>Promise<string|null>;write:(value:string)=>Promise<void>;send:(item:PendingPrediction)=>Promise<void>;changed:(rows:PendingPrediction[])=>void;accepted?:(id:string,answer:Answer)=>void;warning?:(message:string)=>void;now?:()=>number};
/** Fila serial: uma resposta antiga nunca é enviada depois de uma edição mais recente. */
export function createPredictionQueue(options:Options){
 const now=options.now??Date.now,items=new Map<string,PendingPrediction>();let sequence=0,stopped=false,running=false,persistence=Promise.resolve();
 const emit=()=>options.changed([...items.values()]);
 const persist=()=>{const value=JSON.stringify([...items.values()]);persistence=persistence.catch(()=>{}).then(()=>options.write(value));return persistence;};
 const ready=(async()=>{const raw=await options.read();if(raw){const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('Fila inválida.');for(const r of rows)if(typeof r.questionId==='string'&&typeof r.deadline==='string'&&Number.isFinite(Date.parse(r.deadline))&&r.answer&&typeof r.answer==='object')items.set(r.questionId,{...r,version:typeof r.version==='string'?r.version:`restored-${now()}-${++sequence}`,status:['pending','failed','expired'].includes(r.status)?r.status:'pending'});}if(!stopped)emit();})().catch(()=>{options.warning?.('Não foi possível recuperar os rascunhos deste aparelho. Novas respostas ainda podem ser enviadas enquanto houver conexão.');});
 async function enqueue(questionId:string,answer:Answer,deadline:string){await ready;if(stopped)return;items.set(questionId,{questionId,answer,deadline,version:`${now()}-${++sequence}`,status:'pending'});emit();try{await persist();}catch{const row=items.get(questionId);if(row){row.error='Não foi possível guardar o rascunho neste aparelho.';emit();}throw Error('Rascunho ainda não protegido neste aparelho. Tente novamente.');}}
 async function flush(){await ready;if(stopped||running)return;running=true;try{
  await persistence.catch(()=>{});const attempted=new Set<string>();
  for(;;){if(stopped)break;const row=[...items.values()].find(r=>r.status==='pending'&&!attempted.has(r.version));if(!row)break;
   if(now()>=Date.parse(row.deadline)){items.set(row.questionId,{...row,status:'expired',error:'O prazo terminou. Este rascunho não foi confirmado pelo servidor.'});await persist().catch(()=>options.warning?.('Não foi possível atualizar os rascunhos locais.'));emit();continue;}
   attempted.add(row.version);
   try{await options.send({...row});if(stopped)break;options.accepted?.(row.questionId,row.answer);if(items.get(row.questionId)?.version===row.version)items.delete(row.questionId);await persist().catch(()=>options.warning?.('Palpite confirmado no servidor, mas não foi possível atualizar o armazenamento local.'));emit();}
   catch(e:any){if(stopped)break;if(items.get(row.questionId)?.version!==row.version)continue;const permanent=['42501','23503','22P02','PGRST301'].includes(e?.code)||[401,403,404].includes(e?.status);items.set(row.questionId,{...row,status:permanent?'failed':'pending',error:permanent?'O servidor não aceitou este palpite. Confira o prazo e sua participação.':'Sem confirmação do servidor. O rascunho será reenviado.'});await persist().catch(()=>options.warning?.('Não foi possível atualizar os rascunhos locais.'));emit();continue;}
  }
 }finally{running=false;}}
 async function retry(ids:string[]){await ready;for(const id of ids){const row=items.get(id);if(row&&row.status!=='expired')items.set(id,{...row,status:'pending',error:undefined});}await persist().catch(()=>options.warning?.('Rascunhos sem proteção local; tentando enviar com conexão.'));emit();await flush();}
 async function discardExpired(ids:string[]){await ready;for(const id of ids)if(items.get(id)?.status==='expired')items.delete(id);await persist();emit();}
 return {ready,enqueue,flush,retry,discardExpired,stop:()=>{stopped=true;},get:(id:string)=>items.get(id)};
}
