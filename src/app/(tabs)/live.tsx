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
      <Muted>As últimas da F1 em português, com resumo e acesso à fonte.</Muted>
      <Row>{filters.map(option=><Pressable key={option.label} accessibilityRole="button" accessibilityState={{selected:filter===option.value}} onPress={()=>select(option.value)} style={{flex:1,minHeight:44,borderRadius:24,alignItems:'center',justifyContent:'center',backgroundColor:filter===option.value?colors.red:colors.card,borderWidth:1,borderColor:filter===option.value?colors.red:colors.border}}><Text style={{color:colors.text,fontWeight:'700'}}>{option.label}</Text></Pressable>)}</Row>
      {latestCheck&&<Muted style={{fontSize:12}}>Fontes verificadas em {fmtDate(latestCheck)} · Brasília</Muted>}
      {(offline||stale)&&<Muted style={{color:colors.gold}}>Há fontes sem atualização recente. As últimas publicações disponíveis foram mantidas.</Muted>}
      {!!error&&<Card><Muted>{error}</Muted><Button title="Tentar novamente" onPress={()=>{setRefreshing(true);void load();}}/></Card>}
      {!!linkError&&<Card><Muted>{linkError}</Muted></Card>}
    </View>}
    ListEmptyComponent={loading?<Loading/>:!error?<Card><H2>{filter==='curiosity'?'As histórias estão chegando':'Nenhuma publicação disponível ainda'}</H2><Muted>Volte em breve ou puxe para atualizar.</Muted></Card>:undefined}
    renderItem={({item,index})=><Card style={index===0?{borderColor:colors.red}:undefined}>
      <Row style={{justifyContent:'space-between',marginBottom:12}}><Pill color={item.kind==='curiosity'?colors.card2:colors.red}>{item.kind==='curiosity'?'CURIOSIDADE':index===0?'EM DESTAQUE':'FÓRMULA 1'}</Pill><Muted style={{fontSize:12}}>{fmtDate(item.published_at)}</Muted></Row>
      <Pressable accessibilityRole="link" accessibilityLabel={`Ler na fonte: ${item.title}`} onPress={()=>void open(item)}><Text style={{fontSize:index===0?25:21,fontWeight:'800',lineHeight:index===0?31:27,color:colors.text}}>{item.title}</Text></Pressable>
      {!!item.summary&&<P style={{marginTop:12,lineHeight:23}}>{item.summary}</P>}
      <Muted style={{marginTop:14,fontSize:12}}>{item.source_name}{item.author?` · ${item.author}`:''}{item.kind==='news'?' · Resumo da fonte':''}</Muted>
      {item.kind==='curiosity'&&item.circuit_id?<Button title="Conhecer esta pista" variant="ghost" onPress={()=>router.push(`/circuit/${item.circuit_id}`)}/>:<Pressable accessibilityRole="link" onPress={()=>void open(item)}><Text style={{color:colors.red,fontWeight:'800',paddingVertical:16}}>Ler na fonte ↗</Text></Pressable>}
    </Card>}
    ListFooterComponent={hasMore&&!loading?<Button title="Mais publicações" variant="ghost" loading={more} onPress={()=>void next()}/>:undefined}/>;
}
