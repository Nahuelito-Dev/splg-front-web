import { useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import {
  Card,
  DateRangePicker,
  DetailList,
  ErrorState,
  KpiCard,
  KpiGrid,
  LoadingState,
} from '../../../common/components/ui';
import { useCarCosts } from '../../../services/queries/fleetExpense';
import { presetRange, type DayRange, type RangePresetId } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { COST_RUBROS, KM_SOURCE_LABEL } from './costLabels';

/** Pestaña «Costos» de la ficha del vehículo (CU-203): los cinco rubros, los km, el costo por km y la evolución mensual. */
export const CarCostsTab = ({ carId }: { carId: string }) => {
  const [range, setRange] = useState<DayRange>(() => presetRange('thisMonth'));
  const [preset, setPreset] = useState<RangePresetId | null>('thisMonth');
  const { data, isPending, error, refetch } = useCarCosts(carId, range);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DateRangePicker
          value={range}
          preset={preset}
          onChange={(next, nextPreset) => {
            setRange(next);
            setPreset(nextPreset);
          }}
        />
      </div>
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="Los costos del vehículo" onRetry={() => void refetch()} />
      ) : (
        <>
          <KpiGrid className="sm:grid-cols-3">
            <KpiCard title="Costo total" icon={CircleDollarSign} value={formatCurrency(data.total)} />
            <KpiCard
              title="Kilómetros"
              icon={CircleDollarSign}
              value={formatNumber(data.km)}
              hint={KM_SOURCE_LABEL[data.kmSource]}
            />
            <KpiCard
              title="Costo por km"
              icon={CircleDollarSign}
              value={data.costPerKm === null ? '—' : formatCurrency(data.costPerKm)}
            />
          </KpiGrid>
          <Card className="p-6">
            <DetailList items={COST_RUBROS.map(({ key, label }) => ({ label, value: formatCurrency(data[key]) }))} />
            {data.insuranceEstimated && (
              <p className="mt-4 text-xs text-muted">
                Una póliza no tiene fecha de inicio: se prorrateó con un año hacia atrás desde su vencimiento
                (estimado).
              </p>
            )}
          </Card>
          <Card className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-left text-sm font-semibold text-ink">Evolución mensual</caption>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Mes</th>
                  {COST_RUBROS.map((r) => (
                    <th key={r.key} className="py-1.5 pr-3 text-right font-medium">
                      {r.label}
                    </th>
                  ))}
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data.monthly.map((m) => (
                  <tr key={m.month} className="border-t border-outline">
                    <td className="py-1.5 pr-3">{m.month}</td>
                    {COST_RUBROS.map((r) => (
                      <td key={r.key} className="py-1.5 pr-3 text-right">
                        {formatCurrency(m[r.key])}
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-semibold">{formatCurrency(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};
