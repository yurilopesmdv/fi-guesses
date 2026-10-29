import {useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import type {CircuitMedia} from '@/lib/types';
import {Button,Muted,P} from '@/ui/primitives';
import {colors} from '@/ui/theme';
/** Os números remetem às curvas do mapa oficial; não inventa coordenadas/hotspots. */
export function CircuitSegments({media,onOpen}:{media:CircuitMedia[];onOpen:(index:number)=>void}){
 const [selected,setSelected]=useState<number|null>(null);if(!media.length)return null;const current=selected===null?null:media[selected];
 return <View style={{marginTop:16}}><P style={{fontWeight:'800'}}>Explore um trecho</P><Muted>Escolha uma curva e localize sua numeração no mapa acima.</Muted><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:12}}>{media.map((m,i)=><Pressable key={m.id} accessibilityRole="button" accessibilityState={{selected:selected===i}} onPress={()=>setSelected(i)} style={{borderRadius:18,padding:12,backgroundColor:selected===i?colors.red:colors.card2}}><Text style={{color:colors.text,fontWeight:'700'}}>{m.section_turns??'Trecho'} · {m.section_title}</Text></Pressable>)}</ScrollView>{current&&<View><P style={{fontWeight:'800'}}>{current.section_title}</P><Muted>{current.section_description}</Muted><Button title="Ver foto oficial deste trecho" variant="ghost" onPress={()=>onOpen(selected!)}/></View>}</View>;
}
