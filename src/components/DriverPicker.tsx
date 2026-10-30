import {Ionicons} from '@expo/vector-icons';
import { DriverContext } from './insights/DriverContext';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Driver, Race, StartingGrid } from '@/lib/types';
import { driversByStartingGrid, startingPositionLabel } from '@/lib/raceGrid';
import { canOpenDriver, openDriver } from '@/lib/nav';
import { Button, Input, Muted } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

type Props = {
  visible: boolean;
  drivers: Driver[];
  startingGrid?: StartingGrid | null;
  race?: Race;
  title?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

/** Lista de pilotos com busca por nome, código, número ou equipe. */
export function DriverPicker({ visible, drivers, title = 'Escolha o piloto', onSelect, onClose, startingGrid, race }: Props) {
  const [q, setQ] = useState('');
  const [codes,setCodes]=useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const ordered = driversByStartingGrid(drivers, startingGrid);
    if (!t) return ordered;
    return ordered.filter((d) =>
      [d.name, d.code, d.team ?? '', String(d.number ?? '')].some((v) => v.toLowerCase().includes(t)),
    );
  }, [q, drivers, startingGrid]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.wrap, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom }]}>
        <Text style={s.title}>{title}</Text>
        {startingGrid && <Muted>Ordem de largada · toque para escolher.</Muted>}
        <Input placeholder="Buscar: nome, número, equipe…" value={q} onChangeText={setQ} autoFocus autoCorrect={false} />
        {race&&codes.length>0&&<DriverContext drivers={drivers} codes={codes} race={race} grid={startingGrid} onClose={()=>setCodes([])}/>}
        <FlatList
          data={list}
          keyExtractor={(d) => d.code}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space(3) }}>Nenhum piloto encontrado</Muted>}
          renderItem={({ item }) => <DriverRow d={item} startingGrid={startingGrid} onPress={() => { onSelect(item.code); setQ(''); onClose(); }} compared={codes.includes(item.code)} onCompare={race?()=>setCodes(prev=>prev.includes(item.code)?prev.filter(c=>c!==item.code):[...prev.slice(-1),item.code]):undefined}/>}

        />
        <Button title="Fechar" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

export function DriverRow({ d, onPress, info = true, startingGrid,compared,onCompare }: { d: Driver; onPress?: () => void; info?: boolean; startingGrid?: StartingGrid | null;compared?:boolean;onCompare?:()=>void }) {
  return (
    <View style={s.row}><Pressable onPress={onPress} style={({pressed})=>[{flex:1,flexDirection:'row',alignItems:'center',gap:8,minWidth:0},pressed&&{opacity:.7}]}>
      <View style={[s.stripe, { backgroundColor: d.team_color ?? colors.muted }]} />
      <Text style={s.num}>{d.number ?? '–'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{d.name}</Text>
        <Muted>{d.team ?? ''}</Muted>
        {startingPositionLabel(startingGrid, d.code) && <Text style={{ color: colors.green, fontWeight: '700' }}>{startingPositionLabel(startingGrid, d.code)}</Text>}
      </View>
      <Text style={s.code}>{d.code}</Text>
      </Pressable>
      {info && canOpenDriver(d) && (
        <Pressable hitSlop={10} onPress={() => openDriver(d)} style={s.info}><Text style={{ color: colors.text, fontWeight: '900', fontSize: 12 }}>i</Text></Pressable>
      )}
      {onCompare&&<Pressable accessibilityRole="button" accessibilityLabel={`Analisar ${d.name}`} accessibilityState={{selected:!!compared}} onPress={onCompare} style={{minHeight:44,minWidth:54,alignItems:'center',justifyContent:'center',gap:3}}><Ionicons accessible={false} name={compared?'checkmark-circle':'git-compare-outline'} size={19} color={compared?colors.green:colors.muted}/><Text style={{color:compared?colors.green:colors.muted,fontSize:10,fontWeight:'700'}}>{compared?'Comparando':'Comparar'}</Text></Pressable>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space(2) },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: space(1.5) },
  row: { flexDirection: 'row', alignItems: 'center', gap:8, backgroundColor: colors.card, borderRadius: radius, padding: space(1.5), marginBottom: space(1) },
  stripe: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  num: { color: colors.muted, fontWeight: '800', width:22, textAlign: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  code: { color: colors.muted, fontWeight: '700' },
  info: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
});
