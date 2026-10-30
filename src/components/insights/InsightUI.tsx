import {useState,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors} from '@/ui/theme';

/** Detalhes secundários ficam disponíveis sem competir com a ação principal. */
export function InsightDetails({title='Como funciona',children,initiallyOpen=false,onOpenChange}:{title?:string;children:ReactNode;initiallyOpen?:boolean;onOpenChange?:(open:boolean)=>void}){
 const [open,setOpen]=useState(initiallyOpen);
 return <View style={{marginTop:8}}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded:open}} onPress={()=>{const next=!open;setOpen(next);onOpenChange?.(next);}} style={s.disclosure}><Text style={s.detailLabel}>{title}</Text><Ionicons accessible={false} name={open?'chevron-up':'chevron-down'} size={16} color={colors.muted}/></Pressable>{open&&<View style={{paddingBottom:12,gap:8}}>{children}</View>}</View>;
}
export function InsightMetric({value,label,accent=false}:{value:string|number;label:string;accent?:boolean}){
 return <View style={s.metric}><Text style={[s.value,accent&&{color:colors.gold}]}>{value}</Text><Text style={s.label}>{label}</Text></View>;
}
export function InsightAction({title,label,icon,active,onPress}:{title:string;label:string;icon:React.ComponentProps<typeof Ionicons>['name'];active?:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:!!active}} onPress={onPress} style={({pressed})=>[s.action,active&&{borderColor:colors.red,backgroundColor:'#28161c'},pressed&&{opacity:.75}]}><Ionicons accessible={false} name={icon} size={21} color={active?colors.red:colors.muted}/><Text style={[s.actionTitle,active&&{color:colors.text}]}>{title}</Text></Pressable>;
}
const s=StyleSheet.create({
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
 detailLabel:{color:colors.muted,fontSize:13,fontWeight:'600',flexShrink:1},
 metric:{flex:1,minWidth:0,backgroundColor:colors.card2,borderRadius:12,padding:12,gap:4},
 value:{color:colors.text,fontSize:26,fontWeight:'800',fontVariant:['tabular-nums']},
 label:{color:colors.muted,fontSize:12,lineHeight:17},
 action:{width:'48%',flexGrow:1,minHeight:68,padding:12,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card2,flexDirection:'row',alignItems:'center',gap:10},
 actionTitle:{color:colors.text,fontSize:14,fontWeight:'700',flexShrink:1},
});
