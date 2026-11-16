import type { GridColDef } from '@mui/x-data-grid';
import { Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, ErrorState, ResponsiveTable, Skeleton } from '../../../common/components/ui';
import type { TruckStockItem } from '../../../services/api/types';
import { useTruckStock } from '../../../services/queries/truckLoads';

const COLUMNS: GridColDef<TruckStockItem>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', flex: 1, minWidth: 120, sortable: false },
  { field: 'full', headerName: 'Llenas', width: 110, type: 'number', sortable: false },
  { field: 'empty', headerName: 'Vacías', width: 110, type: 'number', sortable: false },
  { field: 'defective', headerName: 'Defectuosas', width: 130, type: 'number', sortable: false },
];

interface Props {
  carId: string | undefined;
}

/** Lo que un camión tiene ahora mismo (`GET /truck-loads/cars/:carId/stock`) y si tiene una carga abierta. */
export const TruckStockCard = ({ carId }: Props) => {
  const { data, isPending, isFetching, error, refetch } = useTruckStock(carId);
  if (!carId) {
    return (
      <EmptyState icon={Truck} title="Elegí un camión" description="Para ver qué garrafas lleva en este momento." />
    );
  }
  if (isPending && isFetching) return <Skeleton className="m-4 h-24" />;
  if (error || !data) return <ErrorState error={error} resource="El stock del camión" onRetry={() => void refetch()} />;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-outline px-4 py-3 text-sm">
        <span className="font-semibold text-ink">{data.carPatent ?? 'Camión'}</span>
        {data.openLoadId ? (
          <Link className="text-primary underline" to={`/truck-loads/${data.openLoadId}`}>
            <Badge label={{ text: 'Con carga abierta', tone: 'primary' }} />
          </Link>
        ) : (
          <Badge label={{ text: 'Sin carga abierta', tone: 'neutral' }} />
        )}
      </div>
      <ResponsiveTable
        label="el stock del camión"
        rows={data.items}
        columns={COLUMNS}
        getRowId={(row) => row.gasCylinderId}
        empty={<EmptyState icon={Truck} title="El camión está vacío" description="No tiene garrafas ahora." />}
        renderCard={(row) => (
          <p className="text-sm">
            <b>{row.gasCylinderType}</b> · {row.full} llenas · {row.empty} vacías · {row.defective} defectuosas
          </p>
        )}
      />
    </div>
  );
};
