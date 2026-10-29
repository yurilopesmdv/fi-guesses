import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { circuitMediaUrl } from '@/lib/repo';
import type { CircuitMedia } from '@/lib/types';
import { Button, Muted } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export function CircuitImage({ media, thumbnail = false, height = 210, fit = 'cover' }: { media: CircuitMedia | null; thumbnail?: boolean; height?: number; fit?: 'cover' | 'contain' }) {
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { setFailed(false); }, [media?.id]);
  return <View style={{ height, backgroundColor: colors.bg, justifyContent:'center',overflow:'hidden' }}>
    {media && !failed ? <Image key={`${media.id}:${revision}`} source={{uri:circuitMediaUrl(thumbnail ? media.thumbnail_path : media.storage_path)}} accessibilityLabel={media.caption}
      style={{width:'100%',height:'100%'}} contentFit={fit} cachePolicy="memory-disk" transition={180} onError={() => setFailed(true)} />
      : <View style={{padding:16}}><Muted>{failed ? 'Não foi possível carregar esta imagem.' : 'Imagem indisponível.'}</Muted>
        {failed && <Button title="Tentar carregar imagem" variant="ghost" onPress={() => {setFailed(false);setRevision((v) => v+1);}} />}</View>}
  </View>;
}
