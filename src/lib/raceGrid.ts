import type { Driver, RaceResult, StartingGrid, QualifyingOrder } from './types';

export function resolveGridDrivers<T extends StartingGrid | QualifyingOrder>(grid: T, drivers: Driver[]): T {
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

/** Ordem de escolha ajuda a comparar a largada sem preencher resultados ou palpites. */
export function driversByStartingGrid(drivers: Driver[], grid?: StartingGrid | null): Driver[] {
  if (!grid) return drivers;
  const positions = new Map(grid.rows.map((row) => [row.driver_code, row.position && row.position > 0 ? row.position : Infinity]));
  return [...drivers].sort((a, b) => (positions.get(a.code) ?? Infinity) - (positions.get(b.code) ?? Infinity));
}

export function startingPositionLabel(grid: StartingGrid | null | undefined, code: string): string | null {
  const row = grid?.rows.find((row) => row.driver_code === code);
  if (!row) return null;
  return row.position && row.position > 0 ? `Larga em P${row.position}` : 'Largada sem posição informada';
}
