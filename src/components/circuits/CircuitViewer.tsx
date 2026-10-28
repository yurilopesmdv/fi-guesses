import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { circuitMediaUrl } from '@/lib/repo';
import type { CircuitMedia } from '@/lib/types';
import { Button, Muted, P, Row } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

export function CircuitViewer({ media, index, onClose, onIndex }: { media: CircuitMedia[]; index: number | null; onClose: () => void; onIndex: (index: number) => void }) {
  const {width,height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale=useSharedValue(1), startScale=useSharedValue(1), x=useSharedValue(0), y=useSharedValue(0), startX=useSharedValue(0), startY=useSharedValue(0);
  const [failed,setFailed]=useState(false);
  const [credits,setCredits]=useState(false);
  const current=index === null ? null : media[index];
  useEffect(() => { scale.value=1; startScale.value=1; x.value=0; y.value=0; setFailed(false);setCredits(false); },[index,current?.id,scale,startScale,x,y]);
  const next=(delta:number) => {if(index!==null) onIndex(Math.max(0,Math.min(media.length-1,index+delta)));};
  const pinch=Gesture.Pinch().onStart(()=>{startScale.value=scale.value;}).onUpdate((event)=>{scale.value=Math.min(4,Math.max(1,startScale.value*event.scale));}).onEnd(()=>{if(scale.value<=1){x.value=0;y.value=0;}});
  const pan=Gesture.Pan().onStart(()=>{startX.value=x.value;startY.value=y.value;}).onUpdate((event)=>{
    if(scale.value>1){x.value=Math.max(-width*(scale.value-1)/2,Math.min(width*(scale.value-1)/2,startX.value+event.translationX));y.value=Math.max(-height/2,Math.min(height/2,startY.value+event.translationY));}
  }).onEnd((event)=>{if(scale.value<=1 && Math.abs(event.translationX)>70 && Math.abs(event.translationY)<70){runOnJS(next)(event.translationX<0?1:-1);}});
  const tap=Gesture.Tap().numberOfTaps(2).onEnd(()=>{scale.value=scale.value>1?1:2;x.value=0;y.value=0;});
  const style=useAnimatedStyle(()=>({transform:[{translateX:x.value},{translateY:y.value},{scale:scale.value}]}));
  if(index===null)return null;
  return <Modal visible={index!==null} onRequestClose={onClose} animationType="fade" presentationStyle="fullScreen">
    <GestureHandlerRootView style={{flex:1,backgroundColor:colors.bg,paddingTop:insets.top,paddingBottom:insets.bottom}}>
      <Row style={{padding:space(2),justifyContent:'space-between'}}><P style={{fontWeight:'800'}}>{current?.kind==='map'?'Traçado da pista':`Galeria · ${(index??0)+1} / ${media.length}`}</P>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar imagem" hitSlop={12} onPress={onClose}><Text style={{color:colors.text,fontWeight:'800',fontSize:18,padding:8}}>✕</Text></Pressable></Row>
      <View style={{flex:1,overflow:'hidden',backgroundColor:current?.kind==='map'?'#f7f7f8':colors.bg}}>
        <GestureDetector gesture={Gesture.Simultaneous(pinch,pan,tap)}>
          <Animated.View style={[{flex:1,justifyContent:'center'},style]}>
            {current && !failed ? <Image source={{uri:circuitMediaUrl(current.storage_path)}} accessibilityLabel={current.caption} style={{width:'100%',height:'100%'}} contentFit="contain" cachePolicy="memory-disk" onError={()=>setFailed(true)} />
              : <View style={{padding:24}}><Muted>Imagem indisponível. Verifique sua conexão.</Muted><Button title="Tentar novamente" onPress={()=>setFailed(false)} /></View>}
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={{padding:space(2),gap:8}}>
        <P style={{fontWeight:'700'}}>{current?.caption}</P>
        {current?.period && <Muted>{current.period}</Muted>}
        <Muted>Amplie com dois dedos ou dois toques. Arraste para explorar.</Muted>
        <Row><View style={{flex:1}}><Button title="− Zoom" variant="ghost" onPress={()=>{scale.value=Math.max(1,scale.value-.5);if(scale.value===1){x.value=0;y.value=0;}}}/></View><View style={{flex:1}}><Button title="Ajustar" variant="ghost" onPress={()=>{scale.value=1;x.value=0;y.value=0;}}/></View><View style={{flex:1}}><Button title="Zoom +" variant="ghost" onPress={()=>{scale.value=Math.min(4,scale.value+.5);}}/></View></Row>
        {media.length>1 && <Row><View style={{flex:1}}><Button title="‹ Anterior" variant="ghost" disabled={index===0} onPress={()=>next(-1)} /></View><View style={{flex:1}}><Button title="Próxima ›" variant="ghost" disabled={index===media.length-1} onPress={()=>next(1)} /></View></Row>}
        <Pressable accessibilityRole="button" onPress={()=>setCredits((v)=>!v)}><Text style={{color:colors.muted,textDecorationLine:'underline',paddingVertical:8}}>Créditos e origem {credits?'⌃':'⌄'}</Text></Pressable>
        {credits && current && <ScrollView style={{maxHeight:120}} contentContainerStyle={{gap:6}}><Muted>{current.author} · {current.license}</Muted><Row>
          <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(current.source_url)}><Text style={{color:colors.red,padding:8}}>Ver original ↗</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(current.license_url)}><Text style={{color:colors.red,padding:8}}>Licença ↗</Text></Pressable>
        </Row></ScrollView>}
      </View>
    </GestureHandlerRootView>
  </Modal>;
}
