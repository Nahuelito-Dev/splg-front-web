import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  DateRangePicker,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
} from '../../common/components/ui';
import type { FleetCostSummary } from '../../services/api/types';
import { useFleetCosts } from '../../services/queries/fleetExpense';
import { presetRange, type DayRange, type RangePresetId } from '../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../utils/format';
import { COST_RUBROS, KM_SOURCE_LABEL } from './components/costLabels';

/** El tablero de costos de la flota (CU-204): un renglón por vehículo, de mayor a menor costo por km. */
export const FleetCosts = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<DayRange>(() => presetRange('thisMonth'));
  const [preset, setPreset] = useState<RangePresetId | null>('thisMonth');
  const { data, isFetching, error, refetch } = useFleetCosts(range);
  const goTo = (row: FleetCostSummary) => navigate(`/cars/details/${row.carId}?tab=costs`);

  const columns: GridColDef<FleetCostSummary>[] = [
    {
      field: 'car',
      headerName: 'Vehículo',
      flex: 1.2,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.carPatent ?? 'Sin patente'}
          subtitle={[row.carBrand, row.carModel].filter(Boolean).join(' ')}
          icon={Gauge}
        />
      ),
    },
    ...COST_RUBROS.map(({ key, label }): GridColDef<FleetCostSummary> => ({
      field: key,
      headerName: label,
      width: 125,
      sortable: false,
      valueGetter: ({ row }) => formatCurrency(row[key]),
    })),
    {
      field: 'total',
      headerName: 'Total',
      width: 130,
      sortable: false,
      valueGetter: ({ row }) => formatCurrency(row.total),
    },
    {
      field: 'km',
      headerName: 'Km',
      width: 100,
      sortable: false,
      valueGetter: ({ row }) => formatNumber(row.km),
    },
    {
      field: 'costPerKm',
      headerName: '$/km',
      width: 110,
      sortable: false,
      valueGetter: ({ row }) => (row.costPerKm === null ? '—' : formatCurrency(row.costPerKm)),
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions rowLabel={`costos de ${row.carPatent ?? 'vehículo'}`} onView={() => goTo(row)} />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Costos de la flota"
        description="Qué cuesta cada vehículo en el período: de mayor a menor costo por km, para ver cuáles conviene revisar."
        actions={
          <DateRangePicker
            value={range}
            preset={preset}
            onChange={(next, nextPreset) => {
              setRange(next);
              setPreset(nextPreset);
            }}
          />
        }
      />
      <Card>
        {error ? (
          <ErrorState error={error} resource="Los costos" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="costos de la flota"
            rows={data ?? []}
            columns={columns}
            getRowId={(row) => row.carId}
            loading={isFetching}
            onRowClick={goTo}
            empty={
              <EmptyState
                icon={Gauge}
                title="No hay vehículos"
                description="Cuando se carguen vehículos, acá aparecen sus costos."
              />
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={row.carPatent ?? 'Sin patente'}
                  subtitle={[row.carBrand, row.carModel].filter(Boolean).join(' ')}
                  icon={Gauge}
                />
                <p className="text-sm text-ink-2">
                  Total {formatCurrency(row.total)} · {formatNumber(row.km)} km ·{' '}
                  {row.costPerKm === null ? 'sin $/km' : `${formatCurrency(row.costPerKm)}/km`}
                </p>
                <p className="text-xs text-muted">{KM_SOURCE_LABEL[row.kmSource]}</p>
              </>
            )}
          />
        )}
      </Card>
    </div>
  );
};
