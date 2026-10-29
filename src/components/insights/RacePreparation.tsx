import {useEffect,useState} from 'react';
import {Linking,View} from 'react-native';
import {CircuitLink} from '../circuits/CircuitLink';
import {raceSessions,fmtDate,fmtCountdown,questionDeadline,sessionLabel} from '@/lib/format';
import {listCircuitNews} from '@/lib/repo';
import type {Question,Race,StartingGrid} from '@/lib/types';
import {Button,Card,H2,Muted,P} from '@/ui/primitives';
export function RacePreparation({race,questions,minutes,grid}:{race:Race;questions:Question[];minutes:number;grid:StartingGrid|null}){
 const [expanded,setExpanded]=useState(false),[news,setNews]=useState<Awaited<ReturnType<typeof listCircuitNews>>>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;if(expanded&&race.circuit_id)void listCircuitNews(race.circuit_id).then(rows=>{if(active){setNews(rows);setError('');}}).catch(()=>{if(active)setError('As notícias estão indisponíveis; seus palpites continuam disponíveis.');});return()=>{active=false;};},[race.id,expanded]);
 const next=raceSessions(race).find(([,time])=>Date.parse(time)>Date.now());
 return <Card><H2>Prepare seu palpite</H2><Muted>{grid?`Grid disponível · ${grid.rows.filter(r=>r.position).length} posições informadas`:'Aguardando a publicação do grid; qualy e largada são informações distintas.'}</Muted>{next&&<P style={{marginTop:8}}>Próxima sessão: {next[0]} · {fmtDate(next[1])}</P>}<CircuitLink race={race}/><Button title={expanded?'Recolher preparação':'Ver prazos e notícias desta pista'} variant="ghost" onPress={()=>setExpanded(v=>!v)}/>{expanded&&<><Muted>Horários de Brasília. Cada pergunta mantém seu próprio prazo.</Muted>{questions.map(q=>{const deadline=questionDeadline(q,race,minutes);return <P key={q.id} style={{marginTop:8}}>{q.prompt} · {sessionLabel(q.session)}: {deadline?Date.now()<deadline?`fecha em ${fmtCountdown(deadline-Date.now())}`:`fechou ${fmtDate(new Date(deadline).toISOString())}`:'horário indisponível'}</P>;})}<H2 style={{marginTop:16}}>Notícias vinculadas à pista</H2>{error&&<Muted>{error}</Muted>}{!error&&!news.length&&<Muted>Nenhuma notícia vinculada a esta pista no momento.</Muted>}{news.map(n=><View key={n.id} style={{marginTop:12}}><P>{n.title}</P><Muted>{fmtDate(n.published_at)}</Muted><Button title="Ler na fonte" variant="ghost" onPress={()=>void Linking.openURL(n.url)}/></View>)}</>}</Card>;
}
