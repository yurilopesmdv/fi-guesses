import { useCallback, useRef, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/lib/auth';
import { getContentSources, listContentPosts } from '@/lib/repo';
import type { ContentPost, ContentSourceStatus } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { Button, Card, H1, H2, Loading, Muted, P, Pill, Row } from '@/ui/primitives';
import { InsightDetails } from '@/components/insights/InsightUI';
import { colors, space } from '@/ui/theme';

type Filter = ContentPost['kind'] | null;
const filters: {label:string;value:Filter}[] = [{label:'Todas',value:null},{label:'Notícias',value:'news'},{label:'Curiosidades',value:'curiosity'}];
export default function NewsScreen() {
  const auth=useAuth(),insets=useSafeAreaInsets();
  const [filter,setFilter]=useState<Filter>(null),[posts,setPosts]=useState<ContentPost[]>([]),[sources,setSources]=useState<ContentSourceStatus[]>([]);
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[more,setMore]=useState(false),[hasMore,setHasMore]=useState(false);
  const [error,setError]=useState(''),[linkError,setLinkError]=useState('');
  const version=useRef(0);
  const load=useCallback(async()=>{
    const request=++version.current;
    try {
      const [items,status]=await Promise.all([listContentPosts(filter),getContentSources()]);
      if(request!==version.current)return;
      setPosts(items);setSources(status);setHasMore(items.length===20);setError('');
    } catch {if(request===version.current)setError('Não foi possível atualizar as publicações. Tente novamente.');}
    finally{if(request===version.current){setLoading(false);setRefreshing(false);setMore(false);}}
  },[filter]);
  useFocusEffect(useCallback(()=>{if(auth.session){setLoading(true);void load();}return()=>{version.current++;};},[auth.session,load]));
  const select=(value:Filter)=>{if(value===filter)return;version.current++;setPosts([]);setLoading(true);setError('');setFilter(value);};
  const next=async()=>{
    if(more||refreshing||loading)return;setMore(true);const request=version.current;
    try{const items=await listContentPosts(filter,posts.length);if(request!==version.current)return;setPosts(previous=>[...new Map([...previous,...items].map(p=>[p.id,p])).values()]);setHasMore(items.length===20);setError('');}
    catch{if(request===version.current)setError('Não foi possível carregar mais publicações.');}
    finally{if(request===version.current)setMore(false);}
  };
  const open=async(post:ContentPost)=>{
    setLinkError('');try{if(Platform.OS==='web')await Linking.openURL(post.url);else await WebBrowser.openBrowserAsync(post.url,{toolbarColor:colors.bg,controlsColor:colors.red,showTitle:true});}
    catch{setLinkError('Não foi possível abrir a fonte. Verifique a conexão e tente novamente.');}
  };
  if(!auth.loading&&!auth.session)return <Redirect href="/login"/>;
  const checks=sources.map(s=>s.succeeded_at).filter((v):v is string=>!!v).sort();
  const latestCheck=checks.at(-1),offline=sources.some(s=>s.last_error),stale=latestCheck&&Date.now()-Date.parse(latestCheck)>3*3600000;
  return <FlatList style={{flex:1,backgroundColor:colors.bg}} data={posts} keyExtractor={p=>p.id} initialNumToRender={6} windowSize={5}
    contentContainerStyle={{padding:space(2),paddingBottom:insets.bottom+space(3)}}
    refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={()=>{setRefreshing(true);void load();}}/>}
    ListHeaderComponent={<View style={{gap:12,marginBottom:16}}>
      <Muted style={{color:colors.red,fontWeight:'800',letterSpacing:2}}>DENTRO DA FÓRMULA 1</Muted><H1>Notícias e histórias</H1>
      <Row>{filters.map(option=><Pressable key={option.label} accessibilityRole="button" accessibilityState={{selected:filter===option.value}} onPress={()=>select(option.value)} style={{flex:1,minHeight:44,borderRadius:24,alignItems:'center',justifyContent:'center',backgroundColor:filter===option.value?colors.red:colors.card,borderWidth:1,borderColor:filter===option.value?colors.red:colors.border}}><Text style={{color:colors.text,fontWeight:'700'}}>{option.label}</Text></Pressable>)}</Row>
      {(offline||stale)&&<Muted style={{color:colors.gold,fontSize:12}}>Algumas fontes estão atrasadas. Exibindo as últimas publicações.</Muted>}
      {!!error&&<Card><Muted>{error}</Muted><Button title="Tentar novamente" onPress={()=>{setRefreshing(true);void load();}}/></Card>}
      {!!linkError&&<Card><Muted>{linkError}</Muted></Card>}
    </View>}
    ListEmptyComponent={loading?<Loading/>:!error?<Card><H2>{filter==='curiosity'?'As histórias estão chegando':'Nenhuma publicação disponível ainda'}</H2><Muted>Volte em breve ou puxe para atualizar.</Muted></Card>:undefined}
    renderItem={({item,index})=><NewsPostCard item={item} featured={index===0} onOpen={()=>void open(item)}/>}
    ListFooterComponent={<View>{hasMore&&!loading&&<Button title="Mais publicações" variant="ghost" loading={more} onPress={()=>void next()}/>}<InsightDetails title="Fontes e atualização"><Muted style={{fontSize:12}}>Notícias em português, com resumos e links para as fontes.</Muted>{latestCheck&&<Muted style={{fontSize:12}}>Fontes verificadas em {fmtDate(latestCheck)} · Brasília</Muted>}{sources.map(source=><Muted key={source.id} style={{fontSize:12}}>{source.name}</Muted>)}</InsightDetails></View>}/>;
}

function NewsPostCard({item,featured,onOpen}:{item:ContentPost;featured:boolean;onOpen:()=>void}){
 const [expanded,setExpanded]=useState(false);
 return <Card style={featured?{borderTopWidth:3,borderTopColor:colors.red}:undefined}>
 <Row style={{justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,flexWrap:'wrap'}}><Muted style={{fontSize:12,fontWeight:'700'}}>{item.source_name}</Muted><Muted style={{fontSize:11}}>{fmtDate(item.published_at)}</Muted></Row>
 {(featured||item.kind==='curiosity')&&<Text style={{color:item.kind==='curiosity'?colors.gold:colors.red,fontSize:10,fontWeight:'800',letterSpacing:1.5,marginBottom:8}}>{item.kind==='curiosity'?'CURIOSIDADE':'EM DESTAQUE'}</Text>}
 <Pressable accessibilityRole="link" accessibilityLabel={`Ler na fonte: ${item.title}`} onPress={onOpen}><Text style={{fontSize:featured?24:19,fontWeight:'800',lineHeight:featured?30:26,color:colors.text}}>{item.title}</Text></Pressable>
 {!!item.summary&&<Text numberOfLines={expanded?undefined:2} style={{color:colors.muted,fontSize:14,lineHeight:21,marginTop:10}}>{item.summary}</Text>}
 {expanded&&<Muted style={{fontSize:12,marginTop:10}}>{item.author?`${item.author} · `:''}{item.kind==='news'?'Resumo da fonte':'Acervo de circuitos'}</Muted>}
 <Row style={{justifyContent:'space-between',marginTop:8,flexWrap:'wrap'}}>
 {!!item.summary&&<Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={`${expanded?'Recolher':'Expandir'} resumo: ${item.title}`} onPress={()=>setExpanded(v=>!v)} style={{minHeight:44,justifyContent:'center',paddingRight:12}}><Text style={{color:colors.muted,fontWeight:'600',fontSize:13}}>{expanded?'Menos resumo −':'Mais resumo +'}</Text></Pressable>}
 <Pressable accessibilityRole="link" onPress={item.kind==='curiosity'&&item.circuit_id?()=>router.push(`/circuit/${item.circuit_id}`):onOpen} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.red,fontWeight:'700',fontSize:14}}>{item.kind==='curiosity'&&item.circuit_id?'Conhecer esta pista':'Ler na fonte ↗'}</Text></Pressable>
 </Row></Card>;
}
