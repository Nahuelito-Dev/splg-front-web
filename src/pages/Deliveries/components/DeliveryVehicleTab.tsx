import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { Card, EmptyState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useVehicleAssignmentHistory } from '../../../services/queries/fleet';
import { VehicleAssignmentHistoryTable } from '../../Fleet/components/VehicleAssignmentHistoryTable';
import { CarsManager } from './CarsManager';
import { VehicleInUseCard } from './VehicleInUseCard';

interface Props {
  delivery: { delivery_id: string; user_id: string };
  canWrite: boolean;
  writeHint?: string;
}

/** Pestaña "Vehículo": el que usa ahora, los que condujo con patente propia y el historial de asignación. */
export const DeliveryVehicleTab = ({ delivery, canWrite, writeHint }: Props) => {
  const { needsDistributor } = usePermissions();
  const [historyPagination, setHistoryPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const { data: history, isFetching: isHistoryFetching } = useVehicleAssignmentHistory(
    delivery.delivery_id,
    historyPagination,
    !needsDistributor,
  );

  return (
    <div className="space-y-6">
      <VehicleInUseCard deliveryId={delivery.delivery_id} canWrite={canWrite} writeHint={writeHint} />
      <CarsManager userId={delivery.user_id} />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver el historial de vehículos."
          />
        </Card>
      ) : (
        <VehicleAssignmentHistoryTable
          rows={history?.rows ?? []}
          total={history?.total ?? 0}
          loading={isHistoryFetching}
          pagination={historyPagination}
          onPaginationChange={setHistoryPagination}
          variant="driver"
        />
      )}
    </div>
  );
};
