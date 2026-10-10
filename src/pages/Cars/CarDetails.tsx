import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router-dom';
import { PencilLine, Trash2 } from 'lucide-react';
import {
  AuditHistoryLink,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageCover,
  PageHeader,
  PhotoThumb,
  ProfileSkeleton,
  ProfileTabPanel,
  ProfileTabs,
  type CoverStat,
  type ProfileTabItem,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useProfileTab } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { useCar, useDeleteCar } from '../../services/queries/cars';
import { useCarAssignments } from '../../services/queries/fleet';
import { confirm, notify } from '../../utils/notifications';
import { FleetDocuments } from '../Fleet/components/FleetDocuments';
import { VehicleAssignmentHistoryTable } from '../Fleet/components/VehicleAssignmentHistoryTable';
import { CarFormModal } from './components/CarFormModal';
import { CarSummary } from './components/CarSummary';
import { carIcon } from './components/carIcon';
import { CurrentDriverCard } from './components/CurrentDriverCard';

const TABS: ProfileTabItem[] = [
  { key: 'summary', label: 'Resumen' },
  { key: 'documents', label: 'Documentación' },
  { key: 'history', label: 'Historial de choferes' },
];

export const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/cars');
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const { data: car, isPending, error, refetch } = useCar(id);
  const deleteCar = useDeleteCar();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useProfileTab(
    TABS.map((t) => t.key),
    'summary',
  );
  const [historyPagination, setHistoryPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  // Sin distribuidora elegida (super_admin sin "Ver como") no se dispara: la API la
  // rechaza con un 400 técnico ("Falta la distribuidora...") que no hay que mostrar.
  const { data: history, isFetching: isHistoryFetching } = useCarAssignments(id, historyPagination, !needsDistributor);
  const { data: current } = useCarAssignments(id, { page: 0, pageSize: 1 }, !needsDistributor);
  const inUseBy = current?.rows[0]?.releasedAt === null ? current.rows[0] : undefined;

  const handleDelete = async () => {
    if (!car) return;
    const confirmed = await confirm({
      title: '¿Dar de baja el vehículo?',
      text: `Baja lógica: ${car.car_brand ?? ''} ${car.car_model ?? ''} (${car.car_patent ?? 'sin patente'}) deja de usarse. No se borra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteCar.mutate(car.car_id, {
      onSuccess: () => {
        notify.success('Vehículo dado de baja');
        navigate('/cars');
      },
      onError: notify.error,
    });
  };

  const title = car ? [car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Vehículo' : 'Vehículo';
  useCrumbLeaf(car ? title : undefined, goBack);
  const Icon = carIcon(car?.type_car ?? null);
  const stats: CoverStat[] = [
    { label: 'Año', value: car?.car_year ? String(car.car_year) : '—' },
    { label: 'Capacidad', value: car?.car_capacity == null ? '—' : `${car.car_capacity} kg` },
    {
      label: 'En uso por',
      value: needsDistributor ? '—' : (inUseBy?.driverName ?? 'Libre'),
      hint: needsDistributor ? 'Elegí una distribuidora' : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title="Ficha del vehículo"
        actions={
          car && (
            <>
              <AuditHistoryLink entity="Car" recordId={car.car_id} />
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
                Dar de baja
              </Button>
            </>
          )
        }
      />

      {isPending ? (
        <ProfileSkeleton />
      ) : error || !car ? (
        <ErrorState error={error} resource="El vehículo" onRetry={() => void refetch()} />
      ) : (
        <>
          <PageCover
            avatar={
              <PhotoThumb
                kind="car"
                id={car.car_id}
                url={car.photoUrl}
                size="lg"
                fallback={
                  <span
                    aria-hidden="true"
                    className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary-strong [&_svg]:h-6 [&_svg]:w-6"
                  >
                    <Icon strokeWidth={1.8} />
                  </span>
                }
              />
            }
            title={title}
            subtitle={<span className="font-mono uppercase tracking-wide">{car.car_patent ?? 'Sin patente'}</span>}
            badges={car.type_car ? <Badge label={{ text: car.type_car, tone: 'neutral' }} /> : undefined}
            stats={stats}
          >
            <ProfileTabs tabs={TABS} value={tab} onChange={setTab} />
          </PageCover>

          <ProfileTabPanel tabKey="summary" value={tab}>
            <div className="space-y-6">
              <CarSummary car={car} />
              <CurrentDriverCard carId={car.car_id} />
            </div>
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="documents" value={tab}>
            <FleetDocuments
              subject="vehicle"
              ownerId={car.car_id}
              carType={car.type_car}
              canWrite={canWrite}
              writeHint={writeHint}
            />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="history" value={tab}>
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
          </ProfileTabPanel>
        </>
      )}

      <CarFormModal open={editing} onClose={() => setEditing(false)} car={car ?? null} fixedUserId={car?.user_id} />
    </div>
  );
};
