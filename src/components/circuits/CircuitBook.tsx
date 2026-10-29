import { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { CircuitMedia } from '@/lib/types';
import { Button, Card, H2, Muted, P, Pill, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';
import { CircuitImage } from './CircuitImage';

export function CircuitBook({media,onOpen}:{media:CircuitMedia[];onOpen:(index:number)=>void}){
  const [expanded,setExpanded]=useState(false);
  const {width}=useWindowDimensions();
  useEffect(()=>setExpanded(false),[media[0]?.circuit_id]);
  if(!media.length)return null;
  const visible=expanded?media:media.slice(0,3);
  return <Card>
    <Muted style={{color:colors.red,fontWeight:'800',letterSpacing:1}}>O ASFALTO EM DETALHE</Muted>
    <H2 style={{marginTop:8}}>Por dentro da pista</H2>
    <Muted>Curvas e trechos do traçado de Fórmula 1 · toque para ampliar</Muted>
    {visible.map((m,i)=><View key={m.id} style={{marginTop:20}}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Explorar trecho: ${m.section_title}`} onPress={()=>onOpen(i)} style={{borderRadius:10,overflow:'hidden',borderWidth:1,borderColor:colors.border}}>
        <CircuitImage media={m} thumbnail fit="contain" height={Math.min(360,Math.max(190,(width-64)*m.height/m.width))}/>
      </Pressable>
      <Row style={{marginTop:12,alignItems:'center'}}>{m.section_turns&&<Pill color={colors.red}>{m.section_turns}</Pill>}<P style={{fontSize:18,fontWeight:'800',flex:1}}>{m.section_title}</P></Row>
      {m.section_description&&<P style={{marginTop:8,lineHeight:22}}>{m.section_description}</P>}
      {m.period&&<Muted style={{fontSize:12,marginTop:8}}>{m.period}</Muted>}
      <Pressable accessibilityRole="button" accessibilityLabel={`Ampliar foto de ${m.section_title}`} onPress={()=>onOpen(i)}><Text style={{color:colors.red,fontWeight:'700',paddingVertical:12}}>Ver este trecho ↗</Text></Pressable>
    </View>)}
    {media.length>3&&<Button variant="ghost" title={expanded?'Recolher book':`Explorar todos os trechos (${media.length})`} onPress={()=>setExpanded(v=>!v)}/>}
  </Card>;
}
