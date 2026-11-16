import { useUrlParams } from '../../../hooks/useUrlParam';
import type { DayRange } from '../../../utils/dateRange';
import { DEFAULT_PRESET, presetPeriod, readPeriod, type MetricsPresetId } from './metricsFormat';

/**
 * El período de las métricas en la URL (`from`, `to`): se comparte por link y sobrevive a un F5. Sin fechas, los 30
 * días que usa la API por omisión. `error` dice por qué no se consulta un rango que la API rechazaría.
 */
export const useMetricsPeriod = () => {
  const [params, setParams] = useUrlParams({ from: '', to: '' });
  const { range, preset, error } = readPeriod(params.from, params.to);
  const setPreset = (id: MetricsPresetId) => setParams(id === DEFAULT_PRESET ? { from: '', to: '' } : presetPeriod(id));
  const setRange = (next: DayRange) => setParams(next);
  /** Lo que viaja a la API: nada si es el de omisión o si el rango no vale. */
  const query = range && !error ? range : {};
  return { range, preset, error, query, setPreset, setRange };
};
