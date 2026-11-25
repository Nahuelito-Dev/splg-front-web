import { Gauge } from 'lucide-react';
import { IdentityCell, RankBarsChart } from '../../../common/components/ui';
import type { VehicleUtilizationRow } from '../../../services/api/types';
import { useVehicleUtilization } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatCurrencyExact, formatNumber } from '../../../utils/format';
import { rangeLength } from '../../../utils/dateRange';
import { ReportSection } from './ReportSection';
import type { ReportColumn } from './ReportTable';

const vehicleName = (row: VehicleUtilizationRow) =>
  (row.plate ?? [row.name, row.model].filter(Boolean).join(' ')) || 'Sin patente';

export const VehicleUtilization = ({ range }: { range: DayRange }) => {
  const exceedsMaximumRange = rangeLength(range) > 1830;
  const { data: report, isLoading, error, refetch } = useVehicleUtilization(range, !exceedsMaximumRange);
  const rows = report?.rows ?? [];
  const totals = report?.totals;
  const columns: ReportColumn<VehicleUtilizationRow>[] = [
    {
      header: 'Vehículo',
      render: (row) => (
        <IdentityCell
          title={vehicleName(row)}
          subtitle={[row.name, row.model].filter(Boolean).join(' ')}
          icon={Gauge}
          photo={row.photo ? { kind: 'car', id: row.vehicleId, url: row.photo } : undefined}
        />
      ),
      csv: vehicleName,
    },
    {
      header: 'Días',
      numeric: true,
      render: (row) => formatNumber(row.daysInUse),
      csv: (row) => row.daysInUse,
      total: totals && formatNumber(totals.daysInUse),
    },
    {
      header: 'Km',
      numeric: true,
      render: (row) => formatNumber(row.km),
      csv: (row) => row.km,
      total: totals && formatNumber(totals.km),
    },
    {
      header: 'Entregas',
      numeric: true,
      render: (row) => formatNumber(row.deliveries),
      csv: (row) => row.deliveries,
      total: totals && formatNumber(totals.deliveries),
    },
    {
      header: 'Costo total',
      numeric: true,
      render: (row) => formatCurrency(row.costs.total),
      csv: (row) => row.costs.total,
      total: totals?.costs && (
        <>
          {formatCurrency(totals.costs.total)}
          {totals.insuranceEstimated && (
            <span className="block text-xs font-normal text-muted">incluye seguro estimado</span>
          )}
        </>
      ),
    },
    {
      header: 'Costo/entrega',
      numeric: true,
      render: (row) => (row.costPerDelivery === null ? '—' : formatCurrencyExact(row.costPerDelivery)),
      csv: (row) => row.costPerDelivery ?? '',
      total: totals?.costPerDelivery === null ? '—' : formatCurrencyExact(totals?.costPerDelivery),
    },
    {
      header: 'Costo/km',
      numeric: true,
      render: (row) => (row.costPerKm === null ? '—' : formatCurrencyExact(row.costPerKm)),
      csv: (row) => row.costPerKm ?? '',
      total: totals?.costPerKm === null ? '—' : formatCurrencyExact(totals?.costPerKm),
    },
  ];

  // Vacío sólo si no hubo uso ni costos: con costos sin uso la tabla se muestra.
  const noActivity = rows.every((row) => row.km === 0 && row.deliveries === 0 && row.costs.total === 0);

  return (
    <ReportSection
      title="Utilización por vehículo"
      description="Uso, entregas y costo total. El detalle de costo incluye combustible, mantenimiento, seguro y otros."
      fileName={`utilizacion-por-vehiculo_${range.from}_${range.to}`}
      rows={noActivity ? [] : rows}
      columns={columns}
      getKey={(row) => row.vehicleId}
      loading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      emptyTitle={
        exceedsMaximumRange ? 'El rango supera el máximo de 1.830 días' : 'Sin uso de vehículos en el período'
      }
      emptyDescription={
        exceedsMaximumRange
          ? 'Elegí un período de hasta cinco años para consultar la utilización de vehículos.'
          : undefined
      }
      extraCsvColumns={[
        { header: 'Combustible', value: (row) => row.costs.fuel },
        { header: 'Mantenimiento', value: (row) => row.costs.maintenance },
        { header: 'Seguro', value: (row) => row.costs.insurance },
        { header: 'Seguro estimado', value: (row) => (row.insuranceEstimated ? 'Sí' : 'No') },
        { header: 'Otros', value: (row) => row.costs.other },
      ]}
      renderExpanded={(row) => (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Combustible</dt>
            <dd>{formatCurrency(row.costs.fuel)}</dd>
          </div>
          <div>
            <dt className="text-muted">Mantenimiento</dt>
            <dd>{formatCurrency(row.costs.maintenance)}</dd>
          </div>
          <div>
            <dt className="text-muted">Seguro{row.insuranceEstimated ? ' (estimado)' : ''}</dt>
            <dd>{formatCurrency(row.costs.insurance)}</dd>
          </div>
          <div>
            <dt className="text-muted">Otros</dt>
            <dd>{formatCurrency(row.costs.other)}</dd>
          </div>
          <div>
            <dt className="text-muted">Costo por entrega</dt>
            <dd>{row.costPerDelivery === null ? '—' : formatCurrencyExact(row.costPerDelivery)}</dd>
          </div>
          <div>
            <dt className="text-muted">Costo por km</dt>
            <dd>{row.costPerKm === null ? '—' : formatCurrencyExact(row.costPerKm)}</dd>
          </div>
        </dl>
      )}
      chart={
        <RankBarsChart
          data={rows.map((row) => ({ name: vehicleName(row), value: row.km }))}
          formatValue={formatNumber}
          seriesName="Km"
        />
      }
    />
  );
};
