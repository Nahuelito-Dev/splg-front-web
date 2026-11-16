import { CalendarKanbanViewToggle, DateRangePicker } from '../../../common/components/ui';
import type { DayRange } from '../../../utils/dateRange';
import { METRICS_PRESETS, type MetricsPresetId } from './metricsFormat';

interface Props {
  /** El rango elegido a mano o por atajo; `null` mientras es el de omisión (y `shown` es el que respondió la API). */
  range: DayRange | null;
  shown?: DayRange;
  preset: MetricsPresetId | null;
  onPreset: (id: MetricsPresetId) => void;
  onRange: (range: DayRange) => void;
}

const isPreset = (id: string): id is MetricsPresetId => METRICS_PRESETS.some((preset) => preset.id === id);

/** Período de las métricas: atajos de 7, 30 y 90 días, o un rango cualquiera del calendario. */
export const PeriodFilter = ({ range, shown, preset, onPreset, onRange }: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    <CalendarKanbanViewToggle
      label="Período"
      options={METRICS_PRESETS.map(({ id, label }) => ({ id, label }))}
      value={preset ?? ''}
      onChange={(id) => isPreset(id) && onPreset(id)}
    />
    <DateRangePicker
      label="Rango de fechas"
      value={range ?? shown ?? null}
      preset={null}
      emptyLabel="Rango de fechas"
      onChange={(next) => onRange(next)}
    />
  </div>
);
