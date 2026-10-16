import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getPool, listPoolLifecycles } from './repo';
import type { Driver, Pool, PoolLifecycle, Race } from './types';
import { lockTime } from './format';
import { useSeason } from './useSeason';

type PoolCtx = {
  pool: Pool | null;
  loading: boolean;
  error: string | null;
  lifecycle: PoolLifecycle | null;
  races: Race[];
  drivers: Driver[];
  reload: () => void;
  /** próxima corrida ainda aberta pra palpite (ou a última, se acabou) */
  nextRace: Race | null;
  isOpen: (race: Race) => boolean;
};

const Ctx = createContext<PoolCtx>({ pool: null, loading: true, error: null, lifecycle: null, races: [], drivers: [], reload: () => {}, nextRace: null, isOpen: () => false });

export function PoolProvider({ id, children }: { id: string; children: ReactNode }) {
  const season = useSeason();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState<PoolLifecycle | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    getPool(id)
      .then((data) => { if (active) setPool(data); })
      .catch(() => { if (active) { setPool(null); setError('O bolão pode ter sido excluído, você pode não ter acesso ou a conexão falhou.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reloadKey]);
  useFocusEffect(useCallback(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try { const [state] = await listPoolLifecycles([id]); if (active) setLifecycle(state ?? null); }
      catch { /* mantém o último status se a rede falhar */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30_000);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); sub.remove(); };
  }, [id, reloadKey]));

  const races = pool?.race_id ? season.races.filter((r) => r.id === pool.race_id) : season.races;
  const isOpen = (race: Race) => Date.now() < lockTime(race.date_utc, pool?.lock_minutes_before ?? 0);
  const nextRace = races.find(isOpen) ?? races[races.length - 1] ?? null;

  return <Ctx.Provider value={{ pool, loading, error, lifecycle, races, drivers: season.drivers, reload, nextRace, isOpen }}>{children}</Ctx.Provider>;
}

export const usePool = () => useContext(Ctx);
