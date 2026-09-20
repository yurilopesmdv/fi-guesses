import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildStandings, championshipDrivers, championshipTeams, type ChampDriver, type ChampTeam, hasLiveAccess, latestCarData, latestSession, sessionDrivers, sessionIntervals, sessionLaps, sessionPits,
  sessionPositions, sessionRaceControl, sessionResult, sessionStints, sessionWeather, type CarData, type Lap, type OF1Driver, type RaceControl, type Session, type Standing, type Weather,
} from './openf1';

export type LiveState = {
  session: Session | null; isLive: boolean; hasAccess: boolean; standings: Standing[]; raceControl: RaceControl[];
  weather: Weather | null; laps: Lap[]; error: string | null; loading: boolean; updatedAt: number; leaderLap: number;
  champ: ChampDriver[]; champTeams: ChampTeam[];
};

/** Sessão mais recente da OpenF1; faz polling enquanto ela estiver ao vivo. */
export function useLive(selectedDriver: number | null) {
  const [st, setSt] = useState<LiveState>({ session: null, isLive: false, hasAccess: false, standings: [], raceControl: [], weather: null, laps: [], error: null, loading: true, updatedAt: 0, leaderLap: 0, champ: [], champTeams: [] });
  const [car, setCar] = useState<CarData | null>(null);
  const cache = useRef<{ drivers: OF1Driver[]; positions: any[]; intervals: any[]; laps: Lap[]; sk: number; champ: ChampDriver[]; champTeams: ChampTeam[] } | null>(null);

  const tick = useCallback(async (full = false) => {
    try {
      const session = full || !cache.current ? await latestSession() : st.session!;
      if (!session) throw new Error('Nenhuma sessão encontrada');
      const start = new Date(session.date_start).getTime() - 30 * 60_000, end = new Date(session.date_end).getTime() + 30 * 60_000;
      const isLive = Date.now() >= start && Date.now() <= end;
      const sk = session.session_key;

      if (!cache.current || cache.current.sk !== sk) {
        // intervals tem ~27k linhas por corrida: só a janela recente
        const sinceInt = new Date((isLive ? Date.now() : new Date(session.date_end).getTime()) - (isLive ? 3 : 15) * 60_000).toISOString();
        const [drivers, laps] = await Promise.all([sessionDrivers(sk), sessionLaps(sk)]);
        let positions: any[], intervals: any[];
        if (isLive) {
          [positions, intervals] = await Promise.all([sessionPositions(sk), sessionIntervals(sk, sinceInt)]);
        } else {
          // sessão encerrada: resultado oficial já traz posição final e gap
          const result = await sessionResult(sk);
          positions = result.map((r) => ({ driver_number: r.driver_number, position: r.position ?? 99, date: session.date_end }));
          intervals = result.map((r) => ({ driver_number: r.driver_number, gap_to_leader: r.dnf ? 'DNF' : r.dsq ? 'DSQ' : r.dns ? 'DNS' : r.gap_to_leader, interval: null, date: session.date_end }));
        }
        const [champ, champTeams] = await Promise.all([championshipDrivers(sk), championshipTeams(sk)]);
        cache.current = { drivers, positions, intervals, laps, sk, champ, champTeams };
      } else {
        const c = cache.current;
        const sincePos = c.positions.at(-1)?.date, sinceInt = c.intervals.at(-1)?.date;
        const maxLap = Math.max(0, ...c.laps.map((l) => l.lap_number));
        const [positions, intervals, laps] = await Promise.all([sessionPositions(sk, sincePos), sessionIntervals(sk, sinceInt), sessionLaps(sk, Math.max(1, maxLap))]);
        c.positions.push(...positions); c.intervals.push(...intervals);
        const byKey = new Map(c.laps.map((l) => [`${l.driver_number}-${l.lap_number}`, l]));
        for (const l of laps) byKey.set(`${l.driver_number}-${l.lap_number}`, l);
        c.laps = [...byKey.values()].sort((a, b) => a.lap_number - b.lap_number);
      }
      const c = cache.current;
      const [stints, pits, raceControl, weather, hasAccess] = await Promise.all([sessionStints(sk), sessionPits(sk), sessionRaceControl(sk), sessionWeather(sk), hasLiveAccess()]);
      const standings = buildStandings(c.drivers, c.positions, c.intervals, c.laps, stints, pits);
      const leaderLap = Math.max(0, ...standings.map((s) => s.lapCount));
      setSt({ session, isLive, hasAccess, standings, raceControl: raceControl.slice(-8).reverse(), weather, laps: c.laps, error: null, loading: false, updatedAt: Date.now(), leaderLap, champ: c.champ, champTeams: c.champTeams });
      if (selectedDriver && isLive) setCar(await latestCarData(sk, selectedDriver));
    } catch (e: any) {
      setSt((p) => ({ ...p, error: e.message, loading: false }));
    }
  }, [selectedDriver, st.session]);

  useEffect(() => { tick(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st.isLive) return;
    const id = setInterval(() => tick(), st.hasAccess ? 8000 : 15000);
    return () => clearInterval(id);
  }, [st.isLive, st.hasAccess, tick]);

  return { ...st, car, refresh: () => tick(true) };
}
