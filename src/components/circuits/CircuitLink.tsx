import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { findRaceCircuit } from '@/lib/repo';
import type { Race } from '@/lib/types';
import { colors } from '@/ui/theme';
export function CircuitLink({race}:{race:Race}){
  const [id,setId]=useState<string|null>(race.circuit_id??null);
  useEffect(()=>{let active=true;setId(race.circuit_id??null);void findRaceCircuit(race).then((id)=>{if(active)setId(id);}).catch(()=>{});return()=>{active=false;};},[race.id,race.circuit_id,race.season,race.round,race.series]);
  if(race.series!=='f1'||!id)return null;
  return <Pressable accessibilityRole="button" onPress={()=>router.push(`/circuit/${id}`)}><Text style={{color:colors.red,fontWeight:'700',paddingVertical:12}}>Conhecer a pista · traçado e história ↗</Text></Pressable>;
}
