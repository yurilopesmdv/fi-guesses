import type {Answer,PodiumAnswer,Prediction,Question,Result,Standing,Race} from './types';
export const slots=['p1','p2','p3'] as const;
export function scoreQuestion(q:Question,a:any,r:any,uid:string):number{
 if(!a||!r)return 0;
 if(q.kind==='podium')return slots.reduce((sum,k)=>sum+(!a[k]?0:a[k]===r[k]?3:slots.some(s=>r[s]===a[k])?1:0),0);
 if(q.kind==='driver')return a.driver!=null&&a.driver===r.driver?q.points:0;
 if(q.kind==='yesno')return typeof a.v==='boolean'&&a.v===r.v?q.points:0;
 if(q.kind==='position_of_driver')return typeof a.pos==='number'&&typeof r.pos==='number'?(a.pos===r.pos?q.points:Math.abs(a.pos-r.pos)===1?q.near_points:0):0;
 return r.correct_users?.includes(uid)?q.points:0;
}
export function ranked<T extends {total:number;user_id:string;name:string}>(rows:T[]){const sorted=[...rows].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR')||a.user_id.localeCompare(b.user_id));return sorted.map((row,i)=>({...row,rank:1+sorted.filter(r=>r.total>row.total).length}));}
export type PoolAnalysis={questions:Question[];predictions:Prediction[];results:Result[];races:Race[]};
export function racePoints(data:PoolAnalysis,raceId:string,userId:string){return data.questions.filter(q=>q.race_id===raceId).reduce((sum,q)=>sum+scoreQuestion(q,data.predictions.find(p=>p.question_id===q.id&&p.user_id===userId)?.answer,data.results.find(r=>r.question_id===q.id)?.answer,userId),0);}
export function simulatePodium(members:Standing[],q:Question,predictions:Prediction[],results:Result[],podium:PodiumAnswer){const actual=results.find(r=>r.question_id===q.id)?.answer;return ranked(members.map(m=>{const a=predictions.find(p=>p.question_id===q.id&&p.user_id===m.user_id)?.answer;const before=scoreQuestion(q,a,actual,m.user_id),hypothetical=scoreQuestion(q,a,podium,m.user_id);return {...m,total:m.total-before+hypothetical,delta:hypothetical-before};}));}
export function voteDistribution(qid:string,predictions:Prediction[],slot:keyof PodiumAnswer){const count=new Map<string,number>();for(const p of predictions.filter(p=>p.question_id===qid)){const code=(p.answer as PodiumAnswer)[slot];if(code)count.set(code,(count.get(code)??0)+1);}const answered=[...count.values()].reduce((a,b)=>a+b,0);return [...count.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([code,votes])=>({code,votes,answered,percent:answered?Math.round(100*votes/answered):0}));}
export function podiumBreakdown(a:PodiumAnswer,r:PodiumAnswer){return slots.map(slot=>({slot,code:a[slot],points:!a[slot]?0:a[slot]===r[slot]?3:slots.some(k=>r[k]===a[slot])?1:0}));}
export function reconstructedStandings(data:PoolAnalysis,members:Standing[],race:Race,inclusive:boolean){const cutoff=Date.parse(race.date_utc);return ranked(members.map(m=>({...m,total:data.races.filter(r=>inclusive?Date.parse(r.date_utc)<=cutoff:Date.parse(r.date_utc)<cutoff).reduce((n,r)=>n+racePoints(data,r.id,m.user_id),0)})));}
