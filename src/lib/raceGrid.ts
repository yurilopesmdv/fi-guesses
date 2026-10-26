import type { Driver, RaceResult, StartingGrid } from './types';

export function resolveGridDrivers(grid: StartingGrid, drivers: Driver[]): StartingGrid {
  return { ...grid, rows: grid.rows.map((row) => {
    const d = drivers.find((d) => row.driver_id ? d.driver_id === row.driver_id : d.code === row.driver_code);
    return d ? { ...row, driver_id: d.driver_id ?? undefined, driver_code: d.code } : row;
  }).sort((a, b) => (a.position && a.position > 0 ? a.position : Infinity) - (b.position && b.position > 0 ? b.position : Infinity)) };
}

/** Resultados históricos já guardam o grid real, inclusive quando difere da qualy. */
export function gridFromResults(results: RaceResult[], drivers: Driver[]): StartingGrid | null {
  const race = results.filter((r) => r.series === 'f1' && r.session === 'race');
  if (!race.some((r) => r.grid !== null && r.grid > 0)) return null;
  return resolveGridDrivers({ source: 'results', rows: race.map((r) => {
    const d = drivers.find((d) => d.code === r.driver_code);
    return { position: r.grid, driver_id: d?.driver_id ?? undefined, driver_code: r.driver_code,
      name: d?.name ?? r.driver_code, team: r.team, team_color: d?.team_color ?? undefined };
  }) }, drivers);
}
