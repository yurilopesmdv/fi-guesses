import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getPool } from './repo';
import type { Driver, Pool, Race } from './types';
import { lockTime } from './format';
import { useSeason } from './useSeason';

type PoolCtx = {
  pool: Pool | null;
  races: Race[];
  drivers: Driver[];
  reload: () => void;
  /** próxima corrida ainda aberta pra palpite (ou a última, se acabou) */
  nextRace: Race | null;
  isOpen: (race: Race) => boolean;
};

const Ctx = createContext<PoolCtx>({ pool: null, races: [], drivers: [], reload: () => {}, nextRace: null, isOpen: () => false });

export function PoolProvider({ id, children }: { id: string; children: ReactNode }) {
  const season = useSeason();
  const [pool, setPool] = useState<Pool | null>(null);
  const reload = useCallback(() => { getPool(id).then(setPool).catch(() => {}); }, [id]);
  useEffect(reload, [reload]);

  const races = pool?.race_id ? season.races.filter((r) => r.id === pool.race_id) : season.races;
  const isOpen = (race: Race) => Date.now() < lockTime(race.date_utc, pool?.lock_minutes_before ?? 0);
  const nextRace = races.find(isOpen) ?? races[races.length - 1] ?? null;

  return <Ctx.Provider value={{ pool, races, drivers: season.drivers, reload, nextRace, isOpen }}>{children}</Ctx.Provider>;
}

export const usePool = () => useContext(Ctx);
