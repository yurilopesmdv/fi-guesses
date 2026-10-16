import type { PoolLifecycle } from './types';

export const poolStatusLabel = (state?: PoolLifecycle | null) =>
  !state ? 'Atualizando status' : state.status === 'finished' ? 'Finalizado' : 'Em andamento';

export const poolStatusDescription = (state?: PoolLifecycle | null) => {
  if (!state) return '';
  if (state.status === 'finished') return 'Todas as corridas e perguntas apuradas.';
  if (!state.has_races) return 'Aguardando calendário.';
  if (state.pending_results > 0) return `${state.pending_results} ${state.pending_results === 1 ? 'resultado pendente de apuração' : 'resultados pendentes de apuração'}.`;
  return 'Aguardando as próximas corridas.';
};

/** Em andamento primeiro; em cada grupo, criação mais recente primeiro. */
export function sortPools<T extends { id: string }>(pools: T[], states: Record<string, PoolLifecycle>): T[] {
  return [...pools].sort((a, b) => {
    const stateA = states[a.id], stateB = states[b.id];
    const group = Number(stateA?.status === 'finished') - Number(stateB?.status === 'finished');
    if (group) return group;
    const date = (Date.parse(stateB?.created_at ?? '') || 0) - (Date.parse(stateA?.created_at ?? '') || 0);
    return date || a.id.localeCompare(b.id);
  });
}
