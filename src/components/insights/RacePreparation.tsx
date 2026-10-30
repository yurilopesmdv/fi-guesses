import {useEffect,useState} from 'react';
import {Linking,View} from 'react-native';
import {CircuitLink} from '../circuits/CircuitLink';
import {raceSessions,fmtDate,fmtCountdown,questionDeadline,sessionLabel} from '@/lib/format';
import {listCircuitNews} from '@/lib/repo';
import type {Question,Race,StartingGrid} from '@/lib/types';
import {InsightDetails} from './InsightUI';
import {colors} from '@/ui/theme';
import {Button,Card,H2,Muted,P,Pill,Row} from '@/ui/primitives';
export function RacePreparation({race,questions,minutes,grid}:{race:Race;questions:Question[];minutes:number;grid:StartingGrid|null}){
 const [expanded,setExpanded]=useState(false),[news,setNews]=useState<Awaited<ReturnType<typeof listCircuitNews>>>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;if(expanded&&race.circuit_id)void listCircuitNews(race.circuit_id).then(rows=>{if(active){setNews(rows);setError('');}}).catch(()=>{if(active)setError('As notícias estão indisponíveis; seus palpites continuam disponíveis.');});return()=>{active=false;};},[race.id,expanded]);
 const next=raceSessions(race).find(([,time])=>Date.parse(time)>Date.now());
 return <Card><H2>Prepare seu palpite</H2><Row style={{flexWrap:'wrap'}}><Pill color={grid?colors.card2:colors.border}>{grid?`Grid · ${grid.rows.filter(r=>r.position).length} posições`:'Grid pendente'}</Pill>{next&&<Muted style={{fontSize:12}}>{next[0]} · {fmtDate(next[1])}</Muted>}</Row>
 <InsightDetails title="Prazos e notícias da pista" onOpenChange={setExpanded}>
 <Muted style={{fontSize:12}}>Horários de Brasília</Muted>
 {questions.map(q=>{const deadline=questionDeadline(q,race,minutes);return <View key={q.id} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:colors.border,gap:4}}><P style={{fontWeight:'600'}}>{q.prompt}</P><Muted style={{fontSize:12}}>{sessionLabel(q.session)} · {deadline?Date.now()<deadline?`Fecha em ${fmtCountdown(deadline-Date.now())}`:`Fechou ${fmtDate(new Date(deadline).toISOString())}`:'Horário indisponível'}</Muted></View>;})}
 <CircuitLink race={race}/>
 <InsightDetails title="Como ler os prazos"><Muted>Cada pergunta mantém seu próprio prazo. Qualy e grid de largada são informações distintas; o grid aparece após a publicação.</Muted></InsightDetails>
 <H2 style={{marginTop:8}}>Notícias da pista</H2>{error&&<Muted>{error}</Muted>}{!error&&!news.length&&<Muted>Sem notícias vinculadas no momento.</Muted>}{news.map(n=><View key={n.id} style={{marginTop:12}}><P>{n.title}</P><Muted style={{fontSize:12}}>{fmtDate(n.published_at)}</Muted><Button title="Ler na fonte" variant="ghost" onPress={()=>void Linking.openURL(n.url)}/></View>)}
 </InsightDetails></Card>;
}
