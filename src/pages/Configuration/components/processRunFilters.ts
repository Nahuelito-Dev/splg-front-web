import type { ProcessRun } from '../../../services/api/types';
import { PROCESS_RUN_STATUS } from '../../../utils/statusLabels';

export interface ProcessRunFiltersState {
  process: '' | ProcessRun['process'];
  status: '' | ProcessRun['status'];
  from: string;
  to: string;
}

export const EMPTY_PROCESS_RUN_FILTERS: ProcessRunFiltersState = { process: '', status: '', from: '', to: '' };

/** Un chip por cada filtro activo; la clave es la del campo que se limpia al quitarlo. */
export const processRunChips = (
  filters: ProcessRunFiltersState,
  titleOf: (process: ProcessRun['process']) => string,
): { key: keyof ProcessRunFiltersState; label: string }[] => {
  const chips: { key: keyof ProcessRunFiltersState; label: string }[] = [];
  if (filters.process) chips.push({ key: 'process', label: `Proceso: ${titleOf(filters.process)}` });
  if (filters.status) chips.push({ key: 'status', label: `Resultado: ${PROCESS_RUN_STATUS[filters.status].text}` });
  if (filters.from) chips.push({ key: 'from', label: `Desde ${filters.from}` });
  if (filters.to) chips.push({ key: 'to', label: `Hasta ${filters.to}` });
  return chips;
};
