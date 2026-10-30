import {useEffect,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import type {Driver,Race,StartingGrid} from '@/lib/types';
import {getDriverRaceContext} from '@/lib/repo';
import {startingPositionLabel} from '@/lib/raceGrid';
import {InsightDetails} from './InsightUI';
import {colors} from '@/ui/theme';
import {Button,Card,H2,Muted,P,Row} from '@/ui/primitives';
export function DriverContext({drivers,codes,race,grid,onClose}:{drivers:Driver[];codes:string[];race:Race;grid?:StartingGrid|null;onClose:()=>void}){
 const [data,setData]=useState<Record<string,Awaited<ReturnType<typeof getDriverRaceContext>>>>({}),[error,setError]=useState('');
 useEffect(()=>{let active=true;setData({});setError('');void Promise.all(codes.map(async code=>{const d=drivers.find(d=>d.code===code);return [code,d?.driver_id?await getDriverRaceContext(d.driver_id,race):null] as const;})).then(rows=>{if(active)setData(Object.fromEntries(rows));}).catch(()=>{if(active)setError('Não foi possível consultar o histórico agora. Você pode continuar escolhendo.');});return()=>{active=false;};},[codes.join(','),race.id]);
 return <Card><ScrollView style={{maxHeight:280}}><H2>Compare antes de escolher</H2>{error&&<Muted>{error}</Muted>}
 <Row style={{alignItems:'flex-start',gap:12}}>{codes.map(code=><View key={code} style={{flex:1,minWidth:0,gap:6}}>
 <Text style={{color:colors.text,fontWeight:'800',fontSize:20}}>{code}</Text><P style={{fontSize:13}}>{drivers.find(d=>d.code===code)?.name??code}</P>
 <Text style={{color:colors.green,fontWeight:'700',fontSize:13}}>{startingPositionLabel(grid,code)||'Grid pendente'}</Text>
 {!data[code]?<Muted>{error?'':Object.hasOwn(data,code)?'Histórico indisponível.':'Carregando…'}</Muted>:<>
 <Muted style={{fontSize:12,marginTop:4}}>{data[code]!.recent.length?`${data[code]!.recent.length===1?'Última':'Últimas'} ${data[code]!.recent.length} · ${race.season}`:'Sem provas recentes'}</Muted>
 <Row style={{flexWrap:'wrap',gap:4}}>{data[code]!.recent.map(r=><View key={r.round} style={{padding:6,borderRadius:6,backgroundColor:colors.card2}}><Text style={{fontSize:13,fontWeight:'800',color:r.position<=3?colors.gold:colors.text}}>P{r.position}</Text></View>)}</Row>
 <Muted style={{fontSize:12}}>{!data[code]!.circuit.length?'Sem histórico nesta pista':`${data[code]!.circuit.filter(r=>r.position<=3).length} pódios / ${data[code]!.circuit.length} provas na pista`}</Muted>
 </>}
 </View>)}</Row>
 <InsightDetails title="Provas e detalhes da amostra"><Muted>Até dois pilotos. Apenas resultados importados anteriores a este GP.</Muted>{codes.map(code=>data[code]&&<View key={code} style={{gap:4}}><P style={{fontWeight:'700'}}>{code}</P>{data[code]!.recent.map(r=><Muted key={r.round} style={{fontSize:12}}>{r.name}: P{r.position} · {r.status}</Muted>)}<Muted style={{fontSize:12}}>Nesta pista: {data[code]!.circuit.length} provas importadas{data[code]!.circuit.length===20?' (últimas 20)':''}{!data[code]!.circuit.length?' · Sem amostra histórica.':''}</Muted></View>)}</InsightDetails>
 <Button title="Fechar comparação" variant="ghost" onPress={onClose}/></ScrollView></Card>;
}
