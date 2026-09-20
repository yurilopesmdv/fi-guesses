import { useEffect } from 'react';
import * as Updates from 'expo-updates';

/** No APK: baixa a atualização mais nova ao abrir e recarrega na hora (no Expo Go o próprio Expo Go cuida disso). */
export function useOtaUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    (async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch { /* sem rede ou sem update: segue com a versão atual */ }
    })();
  }, []);
}
