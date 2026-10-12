import type { GridColDef } from '@mui/x-data-grid';
import { Coins } from 'lucide-react';
import { Card, EmptyState, ErrorState, PageHeader, ResponsiveTable } from '../../common/components/ui';
import type { AverageCost } from '../../services/api/types';
import { useAverageCosts } from '../../services/queries/purchases';
import { formatCurrency, formatDateTime } from '../../utils/format';

const money = (value: number | null) => (value === null ? 'Sin compras' : formatCurrency(value));

const COLUMNS: GridColDef<AverageCost>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', width: 140, sortable: false },
  {
    field: 'averageUnitCost',
    headerName: 'Costo promedio',
    width: 160,
    sortable: false,
    valueGetter: ({ row }) => money(row.averageUnitCost),
  },
  {
    field: 'lastUnitCost',
    headerName: 'Última compra',
    width: 150,
    sortable: false,
    valueGetter: ({ row }) => money(row.lastUnitCost),
  },
  {
    field: 'lastReceivedAt',
    headerName: 'Recibida',
    flex: 1,
    minWidth: 180,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.lastReceivedAt),
  },
  { field: 'fullOnHand', headerName: 'Llenas en existencia', width: 190, type: 'number', sortable: false },
];

/** Costo promedio ponderado de las llenas compradas, por tipo de garrafa. */
export const AverageCosts = () => {
  const { data, isPending, error, refetch } = useAverageCosts();
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Costo promedio"
        description="Cuánto cuesta en promedio cada garrafa llena. Solo una compra lo cambia: las ventas, mermas y ajustes no."
      />
      <Card>
        {error ? (
          <ErrorState error={error} resource="Los costos" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="costos"
            rows={data ?? []}
            columns={COLUMNS}
            getRowId={(row) => row.gasCylinderId}
            loading={isPending}
            empty={<EmptyState icon={Coins} title="Sin garrafas en el catálogo" />}
            renderCard={(row) => (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                <p className="text-muted">
                  Promedio {money(row.averageUnitCost)} · última compra {money(row.lastUnitCost)}
                </p>
                <p className="text-muted">
                  {row.fullOnHand} llenas en existencia · recibida {formatDateTime(row.lastReceivedAt)}
                </p>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
};
