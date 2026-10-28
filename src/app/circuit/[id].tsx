import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getCircuitProfile } from '@/lib/repo';
import { circuitCountry, circuitDirection, circuitLength } from '@/lib/circuits';
import type { CircuitProfile } from '@/lib/types';
import { flag, fmtDate } from '@/lib/format';
import { CircuitImage } from '@/components/circuits/CircuitImage';
import { CircuitViewer } from '@/components/circuits/CircuitViewer';
import { Button, Card, H1, H2, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

export default function CircuitScreen(){
  const {id}=useLocalSearchParams<{id:string}>();
  const auth=useAuth();
  const [profile,setProfile]=useState<CircuitProfile|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [viewer,setViewer]=useState<{kind:'photo'|'map';index:number}|null>(null);
  const load=useCallback(async()=>{
    try{setError('');const value=await getCircuitProfile(id);if(!value)throw new Error('Esta pista ainda não está disponível no catálogo.');setProfile(value);}
    catch(e:any){setError(e.message || 'Não foi possível carregar a pista.');}
    finally{setLoading(false);}
  },[id]);
  useFocusEffect(useCallback(()=>{let active=true;if(auth.session){setLoading(true);setProfile(null);void getCircuitProfile(id).then((value)=>{if(!active)return;if(!value)throw new Error('Esta pista ainda não está disponível no catálogo.');setProfile(value);setError('');}).catch((e)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});}return()=>{active=false;};},[id,auth.session]));
  if(!auth.loading && !auth.session)return <Redirect href="/login"/>;
  if(loading)return <Screen scroll={false}><Loading/></Screen>;
  if(!profile)return <Screen><Muted>{error}</Muted><Button title="Tentar novamente" onPress={()=>void load()}/></Screen>;
  const {circuit:c,layout,stats,last_race:last,winners}=profile;
  const photos=profile.media.filter((m)=>m.kind==='photo');
  const maps=profile.media.filter((m)=>m.kind==='map');
  return <>
    <Stack.Screen options={{title:c.name}}/>
    <Screen>
      <View style={{borderRadius:radius,overflow:'hidden',marginBottom:space(2)}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ampliar foto da pista" onPress={()=>photos.length&&setViewer({kind:'photo',index:0})}><CircuitImage media={photos[0]??null} height={230}/></Pressable>
      </View>
      <Muted>{flag(c.country)} {c.locality} · {circuitCountry(c.country)}</Muted>
      <H1>{c.name}</H1>
      <Row style={{flexWrap:'wrap',marginVertical:space(1)}}><Pill color={colors.red}>FÓRMULA 1</Pill>{layout&&<Pill>Traçado · {layout.season}</Pill>}</Row>
      {error&&<Card><Muted>{error}</Muted><Button title="Atualizar pista" variant="ghost" onPress={()=>void load()}/></Card>}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}}>
        <Metric label="EXTENSÃO" value={layout?circuitLength(layout.length_m):'—'}/><Metric label="CURVAS" value={String(layout?.turns??'—')}/>
        <Metric label="ESTREIA NO MUNDIAL" value={String(stats.first_season??'—')}/><Metric label="TEMPORADAS DISPUTADAS" value={String(stats.seasons)}/>
        <Metric label="GRANDS PRIX" value={String(stats.races)}/><Metric label="SENTIDO" value={layout?circuitDirection(layout.direction):'—'}/>
      </View>
      {!stats.complete&&<Muted>Acervo histórico parcial. Os totais podem aumentar com novas importações.</Muted>}
      <Card>
        <H2>O traçado</H2>
        <Muted>Curvas, largada e os trechos que dão identidade à pista.</Muted>
        {maps[0]?<Pressable accessibilityRole="button" accessibilityLabel="Abrir mapa da pista em tela cheia" onPress={()=>setViewer({kind:'map',index:0})} style={{marginTop:12,borderRadius:8,overflow:'hidden'}}>
          <CircuitImage media={maps[0]} height={230} fit="contain"/>
          <Text style={{color:colors.red,fontWeight:'700',paddingVertical:12}}>Ampliar traçado ↗</Text>
        </Pressable>:<Muted>Mapa indisponível.</Muted>}
        {layout?.notes&&<Muted>{layout.notes}</Muted>}
        {maps[0]?.period&&<Muted>{maps[0].period}</Muted>}
      </Card>
      <Card>
        <H2>Último GP nesta pista</H2>
        {last?<><Muted>{last.race_name} · {last.season} · {fmtDate(last.date_utc)}</Muted>{last.winners.map((winner)=><Pressable key={winner.driver_id} accessibilityRole={winner.has_profile?"button":undefined} disabled={!winner.has_profile} onPress={()=>router.push(`/driver/${winner.driver_id}`)}><P style={{fontSize:20,fontWeight:'800',marginTop:12}}>🏆 {winner.driver_name}</P><Muted>{winner.team}</Muted></Pressable>)}
          {last.race_id&&<Button title="Ver resultado completo" variant="ghost" onPress={()=>router.push(`/race/${last.race_id}`)}/>}</>:<Muted>Ainda não há resultado de um GP disputado nesta pista.</Muted>}
      </Card>
      <Card>
        <H2>Os maiores vencedores</H2>
        <Muted>Corridas principais do Mundial · todas as temporadas</Muted>
        {winners.map((w)=><Pressable key={w.driver_id} accessibilityRole={w.has_profile?"button":undefined} disabled={!w.has_profile} onPress={()=>router.push(`/driver/${w.driver_id}`)}><Row style={{paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border}}>
          <Text style={{color:w.rank===1?colors.gold:colors.muted,fontSize:20,fontWeight:'900',width:30}}>{w.rank}</Text><P style={{flex:1,fontWeight:'700'}}>{w.driver_name}</P><P style={{fontWeight:'800'}}>{w.wins} {w.wins===1?'vitória':'vitórias'}</P>{w.has_profile&&<Text style={{color:colors.muted}}>›</Text>}
        </Row></Pressable>)}
      </Card>
      <Card>
        <H2>Explore a pista</H2>
        <Muted>{photos.length} imagens · toque para ampliar</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:12}} contentContainerStyle={{gap:12}}>
          {photos.map((m,i)=><Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Ampliar: ${m.caption}`} onPress={()=>setViewer({kind:'photo',index:i})} style={{width:250,borderRadius:10,overflow:'hidden'}}>
            <CircuitImage media={m} thumbnail height={158}/><P style={{fontSize:13,paddingTop:8}}>{m.caption}</P>{m.period&&<Muted style={{fontSize:12}}>{m.period}</Muted>}
          </Pressable>)}
        </ScrollView>
      </Card>
      <Card>
        <H2>Sobre a pista</H2>
        <Detail label="Cidade" value={c.locality}/><Detail label="País" value={circuitCountry(c.country)}/>
        <Detail label="Primeiro GP no Mundial" value={String(stats.first_season??'—')}/><Detail label="Última temporada disputada" value={String(stats.last_season??'—')}/>
        <Detail label="Temporadas com corrida" value={String(stats.seasons)}/><Detail label="Corridas já realizadas" value={String(stats.races)}/>
        <Detail label="Vencedores diferentes" value={String(stats.different_winners)}/><Detail label="Recorde de vitórias de um piloto" value={String(stats.record_wins)}/>
        <Muted style={{marginTop:12}}>Temporadas e corridas são contagens diferentes: a pista pode ficar anos fora do calendário ou receber dois GPs no mesmo ano.</Muted>
      </Card>
      {layout&&<Card><H2>Ficha do GP · {layout.season}</H2>
        <Detail label="Voltas previstas" value={String(layout.gp_laps??'—')}/><Detail label="Distância prevista" value={layout.gp_distance_km?`${layout.gp_distance_km.toLocaleString('pt-BR')} km`:'—'}/>
        {layout.lap_record_time&&<><Detail label="Recorde de volta em corrida" value={layout.lap_record_time}/><Muted>{layout.lap_record_driver} · {layout.lap_record_year}</Muted></>}
        <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(layout.source_url)}><Text style={{color:colors.red,paddingVertical:12}}>Consultar ficha oficial ↗</Text></Pressable>
      </Card>}
      <Card><H2>Uma pista, muitas histórias</H2><P>{c.description}</P><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(c.official_url)}><Text style={{color:colors.red,paddingVertical:14,fontWeight:'700'}}>Conheça a fonte oficial ↗</Text></Pressable></Card>
      {stats.synced_at&&<Muted style={{textAlign:'center'}}>Histórico atualizado em {fmtDate(stats.synced_at)} · Fotos e mapas com créditos no visualizador.</Muted>}
    </Screen>
    <CircuitViewer media={viewer?.kind==='map'?maps:photos} index={viewer?.index??null} onClose={()=>setViewer(null)} onIndex={(index)=>setViewer((v)=>v?{...v,index}:null)}/>
  </>;
}
function Metric({label,value}:{label:string;value:string}){return <View style={{width:'48%',flexGrow:1,padding:14,borderRadius:12,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border}}><Text style={{color:colors.muted,fontSize:10,fontWeight:'800',letterSpacing:.5}}>{label}</Text><P style={{fontWeight:'800',fontSize:21,marginTop:6}}>{value}</P></View>;}

function Detail({label,value}:{label:string;value:string}){return <Row style={{justifyContent:'space-between',alignItems:'flex-start',paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.border}}><Muted style={{flex:1}}>{label}</Muted><P style={{flex:1,textAlign:'right',fontWeight:'700'}}>{value}</P></Row>;}
