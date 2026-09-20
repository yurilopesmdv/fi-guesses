import { useEffect, useState } from 'react';
import { importSeason, listConstructorStandings, listDriverStandings, listDrivers, listRaces } from './repo';
import type { ConstructorStanding, Driver, DriverStanding, Race } from './types';

export const YEARS = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i); // atual … 1950

/** Dados de qualquer temporada; se ainda não estiver no banco, importa da API (uma vez — histórico não muda). */
export function useYear(year: number) {
  const [data, setData] = useState<{ races: Race[]; drivers: Driver[]; ds: DriverStanding[]; cs: ConstructorStanding[] }>({ races: [], drivers: [], ds: [], cs: [] });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const load = async () => {
        const [races, drivers, ds, cs] = await Promise.all([listRaces(year), listDrivers(year), listDriverStandings(year), listConstructorStandings(year)]);
        return { races, drivers, ds, cs };
      };
      let d = await load();
      if (d.races.length === 0 || d.ds.length === 0) {
        setImporting(true);
        try { await importSeason(year); d = await load(); } catch { /* sem rede */ }
        setImporting(false);
      }
      if (alive) { setData(d); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [year, tick]);

  return { ...data, loading, importing, refresh: async () => { await importSeason(year); setTick((t) => t + 1); } };
}
