import { useNavigate, useParams } from 'react-router-dom';
import {
  ErrorState,
  PageHeader,
  ProfileSkeleton,
  ProfileTabPanel,
  ProfileTabs,
  type ProfileTabItem,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useProfileTab } from '../../hooks';
import { useDelivery } from '../../services/queries/deliveries';
import { UserRatingsTab } from '../Ratings/components/UserRatingsTab';
import { FleetDocuments } from '../Fleet/components/FleetDocuments';
import { DeliveryBalanceTab } from './components/DeliveryBalanceTab';
import { DeliveryOrders } from './components/DeliveryOrders';
import { DeliveryOverview } from './components/DeliveryOverview';
import { DeliveryProfileCard } from './components/DeliveryProfileCard';

import { DeliveryVehicleTab } from './components/DeliveryVehicleTab';

const TABS: ProfileTabItem[] = [
  { key: 'overview', label: 'Resumen' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'balance', label: 'Saldo' },
  { key: 'documents', label: 'Documentación' },
  { key: 'vehicle', label: 'Vehículo' },
  { key: 'ratings', label: 'Calificaciones' },
];

export const DeliveryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/deliveries');
  const { canWrite, writeHint } = usePermissions();
  const { data: delivery, isPending, error, refetch } = useDelivery(id);
  const [tab, setTab] = useProfileTab(
    TABS.map((t) => t.key),
    'overview',
  );

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title="Ficha del chofer"
        breadcrumbs={[
          { label: 'Choferes', to: '/deliveries', onClick: goBack },
          { label: delivery?.user?.full_name ?? 'Chofer' },
        ]}
      />

      {isPending ? (
        <ProfileSkeleton />
      ) : error || !delivery ? (
        <ErrorState error={error} resource="El chofer" onRetry={() => void refetch()} />
      ) : (
        <>
          <DeliveryProfileCard delivery={delivery} onDeleted={() => navigate('/deliveries')}>
            <ProfileTabs tabs={TABS} value={tab} onChange={setTab} />
          </DeliveryProfileCard>

          <ProfileTabPanel tabKey="overview" value={tab}>
            <DeliveryOverview delivery={delivery} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="orders" value={tab}>
            <DeliveryOrders deliveryId={delivery.delivery_id} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="balance" value={tab}>
            <DeliveryBalanceTab delivery={delivery} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="documents" value={tab}>
            <FleetDocuments subject="driver" ownerId={delivery.delivery_id} canWrite={canWrite} writeHint={writeHint} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="vehicle" value={tab}>
            <DeliveryVehicleTab delivery={delivery} canWrite={canWrite} writeHint={writeHint} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="ratings" value={tab}>
            <UserRatingsTab userId={delivery.user_id} name={delivery.user?.full_name} />
          </ProfileTabPanel>
        </>
      )}
    </div>
  );
};
