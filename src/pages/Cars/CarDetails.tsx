import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PencilLine, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, IconButton, LoadingState } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useCar, useDeleteCar } from '../../services/queries/cars';
import { useCarAssignments } from '../../services/queries/fleet';
import { confirm, notify } from '../../utils/notifications';
import { FleetDocuments } from '../Fleet/components/FleetDocuments';
import { VehicleAssignmentHistoryTable } from '../Fleet/components/VehicleAssignmentHistoryTable';
import { CarFormModal } from './components/CarFormModal';
import { CarProfileCard } from './components/CarProfileCard';
import { CurrentDriverCard } from './components/CurrentDriverCard';

export const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const { data: car, isPending, error, refetch } = useCar(id);
  const deleteCar = useDeleteCar();
  const [editing, setEditing] = useState(false);
  const [historyPagination, setHistoryPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  // Sin distribuidora elegida (super_admin sin "Ver como") no se dispara: la API la
  // rechaza con un 400 técnico ("Falta la distribuidora...") que no hay que mostrar.
  const { data: history, isFetching: isHistoryFetching } = useCarAssignments(id, historyPagination, !needsDistributor);

  const handleDelete = async () => {
    if (!car) return;
    const confirmed = await confirm({
      title: '¿Eliminar el vehículo?',
      text: `Se elimina ${car.car_brand ?? ''} ${car.car_model ?? ''} (${car.car_patent ?? 'sin patente'}).`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    deleteCar.mutate(car.car_id, {
      onSuccess: () => {
        notify.success('Vehículo eliminado');
        navigate('/cars');
      },
      onError: notify.error,
    });
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconButton label="Volver a vehículos" icon={<ArrowLeft />} onClick={() => navigate('/cars')} />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ficha del vehículo</h1>
        </div>
        {car && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<PencilLine />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => void handleDelete()}
            >
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {isPending ? (
        <LoadingState />
      ) : error || !car ? (
        <ErrorState error={error} resource="El vehículo" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <CarProfileCard car={car} />
          <CurrentDriverCard carId={car.car_id} />
          <FleetDocuments
            subject="vehicle"
            ownerId={car.car_id}
            carType={car.type_car}
            canWrite={canWrite}
            writeHint={writeHint}
          />
          {needsDistributor ? (
            <Card className="p-6">
              <EmptyState
                title="Elegí una distribuidora"
                description="Como administrador general, elegí una con «Ver como» para ver el historial de choferes."
              />
            </Card>
          ) : (
            <VehicleAssignmentHistoryTable
              rows={history?.rows ?? []}
              total={history?.total ?? 0}
              loading={isHistoryFetching}
              pagination={historyPagination}
              onPaginationChange={setHistoryPagination}
              variant="car"
            />
          )}
        </div>
      )}

      <CarFormModal open={editing} onClose={() => setEditing(false)} car={car ?? null} fixedUserId={car?.user_id} />
    </div>
  );
};
