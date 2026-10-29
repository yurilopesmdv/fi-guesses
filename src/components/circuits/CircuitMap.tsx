import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import type {CircuitMedia} from '@/lib/types';
import {CircuitImage} from './CircuitImage';
import {Muted} from '@/ui/primitives';
import {colors} from '@/ui/theme';
// Conferidos visualmente no arquivo oficial 2026 de Interlagos (1920×1080).
const interlagos=[{turns:'T1–T2',x:.10,y:.36},{turns:'T3',x:.10,y:.62},{turns:'Entre T3 e T4',x:.40,y:.82},{turns:'T4',x:.65,y:.94},{turns:'T11',x:.65,y:.45},{turns:'T12',x:.80,y:.66}];
export function CircuitMap({map,photos,onMap,onPhoto}:{map:CircuitMedia;photos:CircuitMedia[];onMap:()=>void;onPhoto:(index:number)=>void}){
 const [width,setWidth]=useState(320),height=width*map.height/map.width;
 const points=map.storage_path.endsWith('/2026trackinterlagosdetailed.webp')?interlagos:[];
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)}><View style={{height,position:'relative'}}><Pressable accessibilityRole="button" accessibilityLabel="Abrir mapa da pista em tela cheia" onPress={onMap}><CircuitImage media={map} height={height} fit="contain"/></Pressable>{points.map(p=>{const index=photos.findIndex(m=>m.section_turns===p.turns);return index<0?null:<Pressable key={p.turns} accessibilityRole="button" accessibilityLabel={`Explorar no mapa: ${photos[index].section_title}`} onPress={()=>onPhoto(index)} style={{position:'absolute',left:`${p.x*100}%`,top:`${p.y*100}%`,width:44,height:44,transform:[{translateX:-22},{translateY:-22}],alignItems:'center',justifyContent:'center'}}><View style={{width:23,height:23,borderRadius:12,backgroundColor:colors.red,borderWidth:2,borderColor:colors.text,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text,fontWeight:'900',fontSize:11}}>{p.turns.startsWith('Entre')?'R':p.turns.replaceAll('T','')}</Text></View></Pressable>;})}</View>{points.length>0&&<Muted>Toque nos marcadores vermelhos para explorar os trechos fotografados.</Muted>}<Pressable accessibilityRole="button" onPress={onMap}><Text style={{color:colors.red,fontWeight:'700',paddingVertical:12}}>Ampliar traçado ↗</Text></Pressable></View>;
}
