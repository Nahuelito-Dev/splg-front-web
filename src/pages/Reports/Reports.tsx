import { useSearchParams } from 'react-router-dom';
import { DateRangePicker, PageHeader } from '../../common/components/ui';
import {
  presetRange,
  isReportableDay,
  matchPreset,
  resolvePreset,
  type DayRange,
  type RangePresetId,
} from '../../utils/dateRange';
import { formatDay } from '../../utils/format';
import { CollectionsCards } from './components/CollectionsCards';
import { DriverSales } from './components/DriverSales';
import { PaymentSales } from './components/PaymentSales';
import { ProductSales } from './components/ProductSales';
import { SalesTrend } from './components/SalesTrend';
import type { Granularity } from './components/salesSeries';
import { SummaryCards } from './components/SummaryCards';

const GRANULARITIES: Granularity[] = ['day', 'week', 'month'];

/** El rango y la agrupación viven en la URL: se comparten por link y sobreviven a un F5. */
const useReportsParams = () => {
  const [params, setParams] = useSearchParams();
  const fallback = presetRange('last30');
  const from = params.get('from');
  const to = params.get('to');
  const valid = isReportableDay(from) && isReportableDay(to) && from <= to;
  const range: DayRange = valid ? { from, to } : fallback;
  const rawGranularity = params.get('group');
  const granularity = GRANULARITIES.find((g) => g === rawGranularity) ?? 'day';

  // El atajo elegido vive en la URL: dos atajos pueden coincidir en fechas (p. ej. «Hoy» y «Este mes» un día 1).
  const storedPreset = params.get('atajo');
  const preset: RangePresetId | null = valid ? (resolvePreset(storedPreset, range) ?? matchPreset(range)) : 'last30';

  const setRange = (next: DayRange, nextPreset: RangePresetId | null) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        copy.set('from', next.from);
        copy.set('to', next.to);
        if (nextPreset) copy.set('atajo', nextPreset);
        else copy.delete('atajo');
        return copy;
      },
      { replace: true },
    );
  const setGranularity = (next: Granularity) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === 'day') copy.delete('group');
        else copy.set('group', next);
        return copy;
      },
      { replace: true },
    );
  return { range, preset, granularity, setRange, setGranularity };
};

export const Reports = () => {
  const { range, preset, granularity, setRange, setGranularity } = useReportsParams();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Reportes"
        description={`Ventas cobradas del ${formatDay(range.from)} al ${formatDay(range.to)}: el efectivo cuenta recién cuando el chofer confirma el cobro o cuando un administrador lo registra como cobrado.`}
        actions={<DateRangePicker value={range} preset={preset} onChange={setRange} />}
      />
      <SummaryCards range={range} />
      <CollectionsCards range={range} />
      <SalesTrend range={range} granularity={granularity} onGranularityChange={setGranularity} />
      <ProductSales range={range} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DriverSales range={range} />
        <PaymentSales range={range} />
      </div>
    </div>
  );
};
