import { useEffect, useState } from 'react';
import { importSeason, listConstructorStandings, listDriverStandings, listDrivers, listRaces } from './repo';
import type { ConstructorStanding, Driver, DriverStanding, Race, Series } from './types';

export const YEARS = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i); // atual … 1950

/** Dados de uma temporada/categoria; F1 de anos antigos importa da API na primeira vez (histórico não muda). */
export function useYear(year: number, series: Series = 'f1') {
  const [data, setData] = useState<{ races: Race[]; drivers: Driver[]; ds: DriverStanding[]; cs: ConstructorStanding[] }>({ races: [], drivers: [], ds: [], cs: [] });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const load = async () => {
        const [races, drivers, ds, cs] = await Promise.all([listRaces(year, series), listDrivers(year, series), listDriverStandings(year, series), listConstructorStandings(year, series)]);
        return { races, drivers, ds, cs };
      };
      let d = await load();
      if (series === 'f1' && (d.races.length === 0 || d.ds.length === 0)) {
        setImporting(true);
        try { await importSeason(year); d = await load(); } catch { /* sem rede */ }
        setImporting(false);
      }
      if (alive) { setData(d); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [year, series, tick]);

  return { ...data, loading, importing, refresh: async () => { if (series === 'f1') await importSeason(year); setTick((t) => t + 1); } };
}
