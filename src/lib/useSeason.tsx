import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { importSeason, listDrivers, listRaces } from './repo';
import type { Driver, Race } from './types';

export const SEASON = new Date().getFullYear();

type Ctx = { races: Race[]; drivers: Driver[]; loading: boolean; reload: () => Promise<void> };
const SeasonCtx = createContext<Ctx>({ races: [], drivers: [], loading: true, reload: async () => {} });

/** Calendário e pilotos da temporada atual — carregados uma vez após o login. */
export function SeasonProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [races, setRaces] = useState<Race[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      let [r, d] = await Promise.all([listRaces(SEASON), listDrivers(SEASON)]);
      if (r.length === 0) { await importSeason(SEASON); [r, d] = await Promise.all([listRaces(SEASON), listDrivers(SEASON)]); }
      setRaces(r); setDrivers(d);
    } catch { /* offline: mantém o que tinha */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (session) reload(); }, [session, reload]);

  return <SeasonCtx.Provider value={{ races, drivers, loading, reload }}>{children}</SeasonCtx.Provider>;
}
export const useSeason = () => useContext(SeasonCtx);
