import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState} from 'react-native';
import {useUserId} from './auth';
import {savePrediction} from './repo';
import {createPredictionQueue,type PendingPrediction} from './predictionQueue';
import type {Answer} from './types';
type Queue=ReturnType<typeof createPredictionQueue>;
type Context={rows:PendingPrediction[];confirmed:string[];acceptedAnswers:Record<string,Answer>;error:string;get:(id:string)=>PendingPrediction|undefined;enqueue:(id:string,answer:Answer,deadline:string)=>Promise<void>;retry:(ids:string[])=>Promise<void>;discardExpired:(ids:string[])=>Promise<void>};
const Ctx=createContext<Context>({rows:[],confirmed:[],acceptedAnswers:{},error:'',get:()=>undefined,enqueue:async()=>{throw Error('Aguardando sua sessão.');},retry:async()=>{},discardExpired:async()=>{}});
export function PredictionOutboxProvider({children}:{children:ReactNode}){
 const uid=useUserId(),liveUid=useRef(uid),queueOwner=useRef(''),queue=useRef<Queue|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [rows,setRows]=useState<PendingPrediction[]>([]),[confirmed,setConfirmed]=useState<string[]>([]),[error,setError]=useState('');
 liveUid.current=uid;
 const [owner,setOwner]=useState('');
 const [acceptedAnswers,setAcceptedAnswers]=useState<Record<string,Answer>>({});
 useEffect(()=>{setOwner(uid);queueOwner.current=uid;setRows([]);setConfirmed([]);setAcceptedAnswers({});setError('');if(!uid)return;let active=true;
  const q=createPredictionQueue({read:()=>AsyncStorage.getItem(`prediction-outbox:v1:${uid}`),write:v=>AsyncStorage.setItem(`prediction-outbox:v1:${uid}`,v),send:row=>savePrediction(row.questionId,row.answer,uid),warning:message=>{if(active)setError(message);},changed:rs=>{if(active)setRows(rs);},accepted:(id,answer)=>{if(active){setConfirmed(ids=>[...new Set([...ids,id])]);setAcceptedAnswers(values=>({...values,[id]:answer}));}}});queue.current=q;
  const flush=()=>{if(AppState.currentState==='active')void q.flush().catch(()=>{if(active)setError('Não foi possível recuperar os rascunhos. Tente reabrir o app.');});};
  void q.ready.then(flush).catch(()=>{if(active)setError('Não foi possível recuperar os rascunhos deste aparelho.');});
  const interval=setInterval(flush,15000),subscription=AppState.addEventListener('change',state=>{if(state==='active')flush();});
  return()=>{active=false;q.stop();queue.current=null;clearInterval(interval);subscription.remove();if(timer.current)clearTimeout(timer.current);};
 },[uid]);
 const get=useCallback((id:string)=>queueOwner.current===liveUid.current?queue.current?.get(id):undefined,[]);
 const enqueue=useCallback(async(id:string,answer:Answer,deadline:string)=>{const q=queue.current;if(!q||queueOwner.current!==liveUid.current)throw Error('Aguardando sua sessão.');try{await q.enqueue(id,answer,deadline);setError('');}finally{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{void q.flush().catch(()=>setError('Não foi possível enviar os rascunhos.'));},600);}},[]);
 return <Ctx.Provider value={{rows:owner===uid?rows:[],confirmed:owner===uid?confirmed:[],acceptedAnswers:owner===uid?acceptedAnswers:{},error:owner===uid?error:'',get,enqueue,retry:async ids=>{await queue.current?.retry(ids);},discardExpired:async ids=>{await queue.current?.discardExpired(ids);}}}>{children}</Ctx.Provider>;
}
export const usePredictionOutbox=()=>useContext(Ctx);
