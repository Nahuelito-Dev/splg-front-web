import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router-dom';
import { PencilLine, RotateCcw, Trash2 } from 'lucide-react';
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
  PageContainer,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useProfileTab } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { useCar, useDeleteCar } from '../../services/queries/cars';
import { useCarAssignments } from '../../services/queries/fleet';
import { useReactivateCar } from '../../services/queries/fleetExpense';
import { confirm, notify } from '../../utils/notifications';
import { CAR_FLEET_STATUS, labelOf } from '../../utils/statusLabels';
import { FleetDocuments } from '../Fleet/components/FleetDocuments';
import { CarAccidentsTab } from '../FleetExpense/components/CarAccidentsTab';
import { CarCostsTab } from '../FleetExpense/components/CarCostsTab';
import { CarFinesTab } from '../FleetExpense/components/CarFinesTab';
import { CarFuelTab } from '../FleetExpense/components/CarFuelTab';
import { CarTiresTab } from '../FleetExpense/components/CarTiresTab';
import { CarInsuranceTab } from '../Insurance/components/CarInsuranceTab';
import { VehicleAssignmentHistoryTable } from '../Fleet/components/VehicleAssignmentHistoryTable';
import { CarFormModal } from './components/CarFormModal';
import { CarSummary } from './components/CarSummary';
import { carIcon } from './components/carIcon';
import { CarNextWindowCard } from './components/CarNextWindowCard';
import { CurrentDriverCard } from './components/CurrentDriverCard';

const TABS: ProfileTabItem[] = [
  { key: 'summary', label: 'Resumen' },
  { key: 'documents', label: 'Documentación' },
  { key: 'history', label: 'Historial de choferes' },
  { key: 'fuel', label: 'Combustible' },
  { key: 'fines', label: 'Multas' },
  { key: 'insurance', label: 'Seguro' },
  { key: 'accidents', label: 'Siniestros' },
  { key: 'costs', label: 'Costos' },
  { key: 'tires', label: 'Neumáticos' },
];

export const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/cars');
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const { data: car, isPending, error, refetch } = useCar(id);
  const deleteCar = useDeleteCar();
  const reactivate = useReactivateCar();
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

  const handleReactivate = async () => {
    if (!car) return;
    const confirmed = await confirm({
      title: '¿Reactivar el vehículo?',
      text: 'Vuelve a la flota si el seguro, la VTV y la habilitación de mercancías peligrosas están vigentes. No se asigna a ningún chofer.',
      confirmText: 'Reactivar',
    });
    if (!confirmed) return;
    reactivate.mutate(car.car_id, {
      onSuccess: () => notify.success('Vehículo reactivado'),
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
    <PageContainer size="md">
      <PageHeader
        title="Ficha del vehículo"
        secondaryActions={
          car
            ? [
                ...(car.fleet_status === 'grounded'
                  ? [
                      {
                        label: 'Reactivar',
                        icon: <RotateCcw />,
                        disabled: !canWrite || reactivate.isPending,
                        title: writeHint,
                        onClick: () => void handleReactivate(),
                      },
                    ]
                  : []),
                {
                  label: 'Dar de baja',
                  icon: <Trash2 />,
                  tone: 'danger' as const,
                  disabled: !canWrite,
                  title: writeHint,
                  onClick: () => void handleDelete(),
                },
              ]
            : []
        }
        actions={
          car && (
            <>
              <AuditHistoryLink entity="Car" recordId={car.car_id} />
              <Button
                size="sm"
                icon={<PencilLine />}
                disabled={!canWrite}
                title={writeHint}
                onClick={() => setEditing(true)}
              >
                Editar
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
            badges={
              <>
                {car.type_car && <Badge label={{ text: car.type_car, tone: 'neutral' }} />}
                {car.fleet_status !== 'active' && <Badge label={labelOf(CAR_FLEET_STATUS, car.fleet_status)} />}
              </>
            }
            stats={stats}
          >
            <ProfileTabs tabs={TABS} value={tab} onChange={setTab} />
          </PageCover>

          <ProfileTabPanel tabKey="summary" value={tab}>
            <div className="space-y-6">
              <CarSummary car={car} />
              <CurrentDriverCard carId={car.car_id} />
              <CarNextWindowCard carId={car.car_id} />
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
          {[
            ['fuel', <CarFuelTab key="fuel" car={car} canWrite={canWrite} writeHint={writeHint} />],
            ['fines', <CarFinesTab key="fines" carId={car.car_id} canWrite={canWrite} writeHint={writeHint} />],
            [
              'insurance',
              <CarInsuranceTab key="insurance" carId={car.car_id} canWrite={canWrite} writeHint={writeHint} />,
            ],
            [
              'accidents',
              <CarAccidentsTab key="accidents" carId={car.car_id} canWrite={canWrite} writeHint={writeHint} />,
            ],
            ['costs', <CarCostsTab key="costs" carId={car.car_id} />],
            ['tires', <CarTiresTab key="tires" carId={car.car_id} />],
          ].map(([key, content]) => (
            <ProfileTabPanel key={String(key)} tabKey={String(key)} value={tab}>
              {needsDistributor ? (
                <Card className="p-6">
                  <EmptyState
                    title="Elegí una distribuidora"
                    description="Como administrador general, elegí una con «Ver como» para ver esta información."
                  />
                </Card>
              ) : tab === key ? (
                content
              ) : null}
            </ProfileTabPanel>
          ))}
        </>
      )}

      <CarFormModal open={editing} onClose={() => setEditing(false)} car={car ?? null} fixedUserId={car?.user_id} />
    </PageContainer>
  );
};
