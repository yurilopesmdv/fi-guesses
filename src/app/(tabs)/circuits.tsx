import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { listCircuits, listCircuitArchive } from '@/lib/repo';
import { filterCircuits, nextCircuit, circuitCountry, circuitLength } from '@/lib/circuits';
import type { CircuitSummary } from '@/lib/types';
import { SEASON } from '@/lib/useSeason';
import { flag } from '@/lib/format';
import { CircuitImage } from '@/components/circuits/CircuitImage';
import { MapSheet, WorldMap, type MapPoint } from '@/components/circuits/WorldMap';
import { Button, Card, H1, Input, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

export default function CircuitsScreen() {
  const auth=useAuth();
  const insets=useSafeAreaInsets();
  const [rows,setRows]=useState<CircuitSummary[]>([]);
  const [historical,setHistorical]=useState<CircuitSummary[]>([]);
  const [archive,setArchive]=useState(false);
  const [query,setQuery]=useState('');
  const [country,setCountry]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const [mapMode,setMapMode]=useState(false);
  const [picked,setPicked]=useState<MapPoint[]>([]);
  const load=useCallback(async()=>{
    try {setError('');const [current,old]=await Promise.all([listCircuits(SEASON),listCircuitArchive(SEASON)]);setRows(current);setHistorical(old);}
    catch {setError('Não foi possível carregar as pistas. Verifique sua conexão e tente novamente.');}
    finally{setLoading(false);setRefreshing(false);}
  },[]);
  useFocusEffect(useCallback(()=>{if(auth.session)void load();},[auth.session,load]));
  if(!auth.loading && !auth.session)return <Redirect href="/login"/>;
  const visibleRows=archive?historical:rows;
  const next=archive?null:nextCircuit(rows);
  const filtered=filterCircuits(visibleRows,query).filter((row)=>!country||row.circuit.country===country);
  const countries=[...new Set(visibleRows.map((row)=>row.circuit.country))].sort((a,b)=>circuitCountry(a).localeCompare(circuitCountry(b),'pt-BR'));
  return <View style={{flex:1,backgroundColor:colors.bg}}>
    <FlatList data={filtered} keyExtractor={(row)=>row.circuit.id} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={5}
      contentContainerStyle={{padding:space(2),paddingBottom:insets.bottom+space(3)}} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={()=>{setRefreshing(true);void load();}}/>}
      ListHeaderComponent={<View style={{gap:space(1),marginBottom:space(2)}}>
        <Muted style={{color:colors.red,fontWeight:'800',letterSpacing:2}}>CONHEÇA CADA CURVA</Muted>
        <H1>{archive?'Pistas históricas':'Pistas da temporada'}</H1>
        <Muted>{visibleRows.length?`${visibleRows.length} pistas · `:''}{archive?`Fora do calendário de ${SEASON}`:`Fórmula 1 · ${SEASON}`}</Muted>
        <Row>{[false,true].map(value=><View key={String(value)} style={{flex:1}}><Button title={value?`Históricas · ${historical.length}`:`Atuais · ${rows.length}`} variant={archive===value?'primary':'ghost'} onPress={()=>{setArchive(value);setPicked([]);setCountry(null);setQuery('');}}/></View>)}</Row>
        <Row>{[false,true].map(value=><Pressable key={`m${value}`} accessibilityRole="button" accessibilityState={{selected:mapMode===value}} onPress={()=>{setMapMode(value);setPicked([]);}} style={{flex:1,minHeight:44,borderRadius:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border,backgroundColor:mapMode===value?colors.card2:'transparent'}}><Text style={{color:colors.text,fontWeight:'700'}}>{value?'Mapa':'Lista'}</Text></Pressable>)}</Row>
        {mapMode&&<WorldMap points={filtered.flatMap((row)=>row.circuit.latitude!=null&&row.circuit.longitude!=null?[{id:row.circuit.id,lat:row.circuit.latitude,lon:row.circuit.longitude,label:row.circuit.name}]:[])} onSelect={setPicked} caption={`${filtered.length} pistas · números agrupam pistas próximas`}/>}
        {mapMode&&picked.length>0&&<MapSheet>{picked.map((p)=>{const row=visibleRows.find((r)=>r.circuit.id===p.id);return <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Conhecer ${p.label}`} onPress={()=>router.push(`/circuit/${p.id}`)} style={{minHeight:44,justifyContent:'center'}}><P style={{fontWeight:'700'}}>{row?flag(row.circuit.country):''} {p.label} ›</P>{row&&<Muted style={{fontSize:12}}>{row.circuit.locality} · {row.stats.seasons} temporadas · {row.stats.races} corridas</Muted>}</Pressable>;})}</MapSheet>}
        <Input value={query} onChangeText={setQuery} placeholder="Buscar pista, cidade ou país" autoCorrect={false}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {[null,...countries].map((value)=><Pressable key={value??'all'} accessibilityRole="button" accessibilityState={{selected:country===value}} onPress={()=>setCountry(value)} style={{borderRadius:24,minHeight:44,paddingHorizontal:14,justifyContent:'center',backgroundColor:country===value?colors.red:colors.card2,borderWidth:1,borderColor:country===value?colors.red:colors.border}}>
            <Text style={{color:colors.text,fontWeight:'700'}}>{value?`${flag(value)} ${circuitCountry(value)}`:'Todas'} · {value?visibleRows.filter((row)=>row.circuit.country===value).length:visibleRows.length}</Text>
          </Pressable>)}
        </ScrollView>
        {error && <Card><Muted>{error}</Muted><Button title="Tentar novamente" onPress={()=>void load()}/></Card>}
      </View>}
      ListEmptyComponent={loading?<Loading/>:<Muted>{query?'Nenhuma pista encontrada. Tente outro nome.':!error?archive?'O acervo histórico ainda não está disponível.':'As pistas desta temporada ainda não estão disponíveis.':''}</Muted>}
      renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`Conhecer ${item.circuit.name}`} onPress={()=>router.push(`/circuit/${item.circuit.id}`)}>
        <View style={{backgroundColor:colors.card,borderRadius:radius,overflow:'hidden',marginBottom:space(2),borderWidth:1,borderColor:item.circuit.id===next?colors.red:colors.border}}>
          {item.map&&<CircuitImage media={item.map} thumbnail height={180} fit="contain"/>}
          {item.circuit.id===next && <View style={{position:'absolute',top:12,left:12}}><Pill color={colors.red}>PRÓXIMA PARADA</Pill></View>}
          <View style={{padding:space(2),gap:8}}>
            <Row style={{justifyContent:'space-between'}}><Muted>{flag(item.circuit.country)} {item.circuit.locality} · {circuitCountry(item.circuit.country)}</Muted><Text style={{color:colors.red,fontSize:22}}>›</Text></Row>
            <P style={{fontSize:21,fontWeight:'800'}}>{item.circuit.name}</P>
            <Row style={{flexWrap:'wrap'}}>
              {item.layout && <Muted>{circuitLength(item.layout.length_m)} · {item.layout.turns} curvas</Muted>}
              {item.stats.first_season && <Muted>Estreia em {item.stats.first_season}</Muted>}
            </Row>
            <Row style={{marginTop:6,gap:space(2)}}>
              <View style={{flex:1}}><P style={{fontWeight:'700'}}>{item.stats.seasons} temporadas disputadas</P><Muted>{item.stats.races} corridas no Mundial{!item.stats.complete?' · acervo parcial':''}</Muted></View>
            </Row>
          </View>
        </View>
      </Pressable>}/>
  </View>;
}
