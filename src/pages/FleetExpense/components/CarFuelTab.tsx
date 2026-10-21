import { useState } from 'react';
import { Fuel, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  DateRangePicker,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  CardHeader,
} from '../../../common/components/ui';
import type { Car } from '../../../services/api/types';
import { useFuelEfficiency } from '../../../services/queries/fleetExpense';
import { presetRange, type DayRange, type RangePresetId } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { FuelLoadFormModal } from './FuelLoadFormModal';

interface Props {
  car: Car;
  canWrite: boolean;
  writeHint?: string;
}

/** Pestaña «Combustible» de la ficha (CU-196): rendimiento y costo por km, tramo a tramo, entre cargas de tanque lleno. */
export const CarFuelTab = ({ car, canWrite, writeHint }: Props) => {
  const [range, setRange] = useState<DayRange>(() => presetRange('last30'));
  const [preset, setPreset] = useState<RangePresetId | null>('last30');
  const [creating, setCreating] = useState(false);
  const { data, isPending, error, refetch } = useFuelEfficiency(car.car_id, range);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="text-sm font-medium text-primary hover:underline" to={`/fleet/fuel-loads?car=${car.car_id}`}>
          Ver todas las cargas de este vehículo
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={range}
            preset={preset}
            onChange={(next, nextPreset) => {
              setRange(next);
              setPreset(nextPreset);
            }}
          />
          <Button icon={<Plus />} size="sm" disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Cargar combustible
          </Button>
        </div>
      </div>
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="El consumo" onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard title="Kilómetros medidos" icon={Fuel} value={formatNumber(data.totals.km)} />
            <KpiCard title="Litros" icon={Fuel} value={formatNumber(data.totals.liters)} />
            <KpiCard
              title="Rendimiento"
              icon={Fuel}
              value={data.totals.kmPerLiter === null ? '—' : `${formatNumber(data.totals.kmPerLiter)} km/L`}
            />
            <KpiCard
              title="Costo por km"
              icon={Fuel}
              value={data.totals.costPerKm === null ? '—' : formatCurrency(data.totals.costPerKm)}
            />
          </div>
          <Card className="overflow-x-auto p-4">
            {data.tranches.length === 0 ? (
              <EmptyState
                icon={Fuel}
                title="Sin tramos para medir"
                description="Hacen falta al menos dos cargas de tanque lleno en el período."
              />
            ) : (
              <table className="w-full text-left text-sm">
                <caption className="mb-2 text-left text-sm font-semibold text-ink">
                  Tramos entre cargas de tanque lleno
                </caption>
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Km</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Recorridos</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Litros</th>
                    <th className="py-1.5 pr-3 text-right font-medium">km/L</th>
                    <th className="py-1.5 text-right font-medium">$/km</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {data.tranches.map((t) => (
                    <tr key={t.toLoadId} className="border-t border-outline">
                      <td className="py-1.5 pr-3">
                        {formatNumber(t.fromKm)} → {formatNumber(t.toKm)}
                      </td>
                      <td className="py-1.5 pr-3 text-right">{formatNumber(t.km)}</td>
                      <td className="py-1.5 pr-3 text-right">{formatNumber(t.liters)}</td>
                      <td className="py-1.5 pr-3 text-right">{formatNumber(t.kmPerLiter)}</td>
                      <td className="py-1.5 text-right">{formatCurrency(t.costPerKm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          {data.anomalies.length > 0 && (
            <Card className="space-y-2 p-4">
              <CardHeader title="Cargas con consumo anómalo" as="h3" className="" />
              <ul className="space-y-1 text-sm">
                {data.anomalies.map((a) => (
                  <li key={a.fuelLoadId} className="flex flex-wrap items-center gap-2">
                    <Badge label={{ text: 'Anómala', tone: 'warn' }} />
                    <span className="font-mono">
                      {formatNumber(a.odometerKm)} km · {formatNumber(a.liters)} L
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
      <FuelLoadFormModal open={creating} onClose={() => setCreating(false)} load={null} fixedCarId={car.car_id} />
    </div>
  );
};
