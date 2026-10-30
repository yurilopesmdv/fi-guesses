import {useCallback,useState} from 'react';
import {AppState,Pressable,ScrollView,Text,View} from 'react-native';
import {Redirect,router,useFocusEffect} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useAuth} from '@/lib/auth';
import {getMyProfileOverview,updateMyProfile} from '@/lib/repo';
import {supabase} from '@/lib/supabase';
import type {MyProfileOverview} from '@/lib/types';
import {InsightDetails,InsightMetric} from '@/components/insights/InsightUI';
import {FollowingSection} from '@/components/profile/FollowingSection';
import {LastGpCard} from '@/components/profile/LastGpCard';
import {Achievements} from '@/components/profile/Achievements';
import {Button,Card,H1,H2,Input,Loading,Muted,P,Row,Screen} from '@/ui/primitives';
import {colors} from '@/ui/theme';
const avatars=['🏎️','🏁','🔥','🦁','🐆','🦈','🚀','⚡','🍀','👑','🎯','🐢'];

export default function MyProfile(){
 const auth=useAuth(),uid=auth.session?.user.id;
 const [data,setData]=useState<MyProfileOverview|null>(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const [year,setYear]=useState<number|null>(null),[poolId,setPoolId]=useState<string|null>(null);
 const [editing,setEditing]=useState(false),[name,setName]=useState(''),[avatar,setAvatar]=useState('🏎️'),[busy,setBusy]=useState(false),[editError,setEditError]=useState('');
 useFocusEffect(useCallback(()=>{
  let active=true,pending=false;
  const load=async()=>{if(!uid||pending)return;pending=true;try{const value=await getMyProfileOverview();if(!value||value.profile.id!==uid)throw Error();if(active){setData(value);setError('');}}catch{if(active)setError('Não foi possível atualizar seu perfil.');}finally{pending=false;}};
  void load();const sub=AppState.addEventListener('change',state=>{if(state==='active')void load();});
  const timer=setInterval(()=>{if(AppState.currentState==='active')void load();},60000);
  return()=>{active=false;sub.remove();clearInterval(timer);};
 },[uid,refresh]));
 if(!auth.loading&&!uid)return <Redirect href="/login"/>;
 const current=data?.profile.id===uid?data:null;
 if(!current)return <Screen>{error?<Card><H2>Seu perfil está indisponível</H2><Muted>{error}</Muted><Button title="Tentar novamente" onPress={()=>setRefresh(v=>v+1)}/></Card>:<Loading/>}</Screen>;
 const years=[...new Set(current.pools.map(p=>p.season))].sort((a,b)=>b-a);
 const activeYear=year!==null&&years.includes(year)?year:null;
 const choices=current.pools.filter(p=>activeYear===null||p.season===activeYear),activePoolId=choices.some(p=>p.id===poolId)?poolId:null,selected=choices.filter(p=>activePoolId===null||p.id===activePoolId);
 const sum=(field:'total'|'max_points'|'earned_points'|'scored_questions'|'exact_podiums'|'eligible_questions'|'answered_questions')=>selected.reduce((n,p)=>n+p[field],0);
 const possible=sum('max_points'),earned=sum('earned_points'),eligible=sum('eligible_questions'),answered=sum('answered_questions');
 const finished=selected.filter(p=>p.status==='finished'),wins=finished.filter(p=>p.rank===1).length,podiums=finished.filter(p=>p.rank<=3).length;
 const startEdit=()=>{setName(current.profile.name);setAvatar(current.profile.avatar);setEditError('');setEditing(true);};
 const save=async()=>{if(!name.trim()){setEditError('Informe seu nome.');return;}setBusy(true);setEditError('');try{await updateMyProfile({name:name.trim(),avatar},uid);setData(prev=>prev&&prev.profile.id===uid?{...prev,profile:{...prev.profile,name:name.trim(),avatar}}:prev);setEditing(false);setRefresh(v=>v+1);}catch(e:any){setEditError(e.message??'Não foi possível salvar.');}finally{setBusy(false);}};
 return <Screen>
  <Card><Row style={{gap:14}}><Text style={{fontSize:44}}>{current.profile.avatar}</Text><View style={{flex:1}}><H1>{current.profile.name}</H1><Muted>Seu espaço na F1</Muted></View><Pressable accessibilityRole="button" accessibilityLabel="Editar meu perfil" onPress={startEdit} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="create-outline" size={23} color={colors.muted}/></Pressable></Row>
   <Row style={{marginTop:12,alignItems:'stretch'}}><InsightMetric value={current.global?.total??0} label="pontos no ranking geral" accent/><InsightMetric value={current.global?`${current.global.rank}º`:'—'} label="posição geral"/></Row>
   <InsightDetails title="Sobre o ranking geral"><Muted>Todos os anos e bolões existentes contam, independentemente do filtro abaixo. Empates compartilham posição. Bolões excluídos deixam de contar.</Muted></InsightDetails>
  </Card>
  {editing&&<Card><H2>Editar perfil</H2><Input accessibilityLabel="Nome no perfil" placeholder="Seu nome" value={name} onChangeText={setName}/><Row style={{flexWrap:'wrap'}}>{avatars.map(a=><Pressable key={a} accessibilityRole="button" accessibilityLabel={`Avatar ${a}`} accessibilityState={{selected:avatar===a}} onPress={()=>setAvatar(a)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:avatar===a?colors.red:colors.card2}}><Text style={{fontSize:24}}>{a}</Text></Pressable>)}</Row>{editError&&<P style={{color:colors.gold,marginTop:12}}>{editError}</P>}<Button title="Salvar perfil" loading={busy} onPress={()=>void save()}/><Button title="Cancelar edição" disabled={busy} variant="ghost" onPress={()=>setEditing(false)}/></Card>}
  <LastGpCard refreshKey={refresh}/>
  {error&&<Card><Muted style={{color:colors.gold}}>{error} Exibindo a última atualização.</Muted><Button title="Tentar novamente" variant="ghost" onPress={()=>setRefresh(v=>v+1)}/></Card>}
  <H2>Seus bolões</H2>
  {!!current.pools.length&&<View style={{marginBottom:16,gap:8}}>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Filter label="Todos os anos" selected={activeYear===null} onPress={()=>{setYear(null);setPoolId(null);}}/>{years.map(y=><Filter key={y} label={String(y)} selected={activeYear===y} onPress={()=>{setYear(y);setPoolId(null);}}/>)}</ScrollView>
   {choices.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Filter label="Todos os bolões" selected={activePoolId===null} onPress={()=>setPoolId(null)}/>{choices.map(p=><Filter key={p.id} label={p.name} selected={activePoolId===p.id} onPress={()=>setPoolId(p.id)}/>)}</ScrollView>}
  </View>}
  {!selected.length?<Card><H2>{current.pools.length?'Sem bolões neste recorte':'Sua história começa aqui'}</H2><Muted>Participe de um bolão para acompanhar seu desempenho.</Muted><Button title="Ir para os bolões" onPress={()=>router.push('/(tabs)')}/></Card>:<>
   <Card><Row style={{alignItems:'stretch'}}><InsightMetric value={selected.length-finished.length} label="em andamento"/><InsightMetric value={finished.length} label="finalizados"/></Row><Row style={{marginTop:8,alignItems:'stretch'}}><InsightMetric value={sum('total')} label="pontos neste recorte" accent/><InsightMetric value={sum('exact_podiums')} label="pódios exatos acertados"/></Row></Card>
   <Card><H2>Aproveitamento</H2><Text style={{fontSize:36,fontWeight:'800',color:colors.gold}}>{possible>0?`${Math.round(100*earned/possible)}%`:'—'}</Text><Muted>{earned} de {possible} pontos nas perguntas com apuração</Muted><View style={{height:6,borderRadius:3,backgroundColor:colors.card2,marginTop:12}}><View style={{height:6,borderRadius:3,backgroundColor:colors.gold,width:`${possible>0?Math.max(0,Math.min(100,100*earned/possible)):0}%`}}/></View><InsightDetails title="Participação e critérios"><P>{answered}/{eligible} perguntas encerradas elegíveis com resposta completa.</P><Muted>Participação considera ingresso no bolão antes do fechamento e perguntas criadas a tempo. Só entram respostas confirmadas; rascunhos não contam.</Muted><Muted>Aproveitamento considera as perguntas com apuração deste recorte. Um mesmo GP em bolões diferentes conta em cada bolão.</Muted></InsightDetails></Card>
   <Card><H2>Resultados finais</H2><Row style={{alignItems:'stretch'}}><InsightMetric value={wins} label="vitórias em bolões" accent/><InsightMetric value={podiums} label="pódios em bolões"/></Row><Muted style={{fontSize:12,marginTop:10}}>Somente bolões finalizados · empates respeitados</Muted></Card>
   {selected.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Ver desempenho em ${p.name}`} onPress={()=>router.push(`/pool/${p.id}/analysis?userId=${uid}`)}><Card><Row><View style={{flex:1,gap:4}}><P style={{fontWeight:'800'}}>{p.name}</P><Muted style={{fontSize:12}}>{p.season} · {p.status==='finished'?'Finalizado':'Em andamento'} · {p.members} participantes</Muted></View><View style={{alignItems:'flex-end',gap:4}}><P style={{fontWeight:'800',color:colors.gold}}>{p.rank}º · {p.total} pts</P><Muted style={{fontSize:12}}>Ver desempenho ›</Muted></View></Row></Card></Pressable>)}
  </>}
  {!!current.pools.length&&<Achievements pools={current.pools}/>}
  <FollowingSection refreshKey={refresh}/>
  <InsightDetails title="Conta"><Muted>Atualizado em {new Date(current.generated_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · Brasília</Muted><Button title="Atualizar perfil" variant="ghost" onPress={()=>setRefresh(v=>v+1)}/><Button title="Sair da conta" variant="ghost" onPress={()=>void supabase.auth.signOut().then(()=>router.replace('/login'))}/></InsightDetails>
 </Screen>;
}
function Filter({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} style={{minHeight:44,paddingHorizontal:16,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.red:colors.card2}}><Text style={{fontSize:13,fontWeight:'700',color:colors.text}}>{label}</Text></Pressable>;
}
