import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, PencilLine, Trash2 } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  PageCover,
  PageHeader,
  ProfileSkeleton,
  ProfileTabPanel,
  ProfileTabs,
  type CoverStat,
  type ProfileTabItem,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useProfileTab } from '../../hooks';
import type { Claim } from '../../services/api/types';
import { useClaims } from '../../services/queries/claims';
import { useCustomer, useCustomerOrderSample, useDeleteCustomer } from '../../services/queries/customers';
import { useCylinders } from '../../services/queries/physicalCylinders';
import { useUserAddresses } from '../../services/queries/userAddresses';
import { formatCurrency, formatDate } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { ClaimDetailDrawer } from '../Claims/components/ClaimDetailDrawer';
import { CylinderLinksCard } from '../PhysicalCylinders/components/CylinderLinksCard';
import { CYLINDER_CARD_LIMIT } from '../PhysicalCylinders/cylinderFilters';
import { UserRatingsTab } from '../Ratings/components/UserRatingsTab';
import { roleLabel } from '../Users/roleLabel';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerAddresses } from './components/details/CustomerAddresses';
import { CustomerClaims } from './components/details/CustomerClaims';
import { CustomerLocationModal } from './components/details/CustomerLocationModal';
import { CustomerOrders } from './components/details/CustomerOrders';
import { CustomerSummary } from './components/details/CustomerSummary';
import { customerStats } from './customerStats';

const TAB_KEYS = ['summary', 'orders', 'addresses', 'cylinders', 'claims', 'ratings'];

export const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/customers');
  const { canManageCustomerAccounts } = usePermissions();
  const { data: customer, isPending, error, refetch } = useCustomer(id);
  const deleteCustomer = useDeleteCustomer();
  const [editing, setEditing] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [tab, setTab] = useProfileTab(TAB_KEYS, 'summary');

  const orders = useCustomerOrderSample(customer?.user_id);
  const addresses = useUserAddresses(customer?.user_id);
  const heldCylinders = useCylinders(
    { customerUserId: customer?.user_id },
    { page: 0, pageSize: CYLINDER_CARD_LIMIT },
    '',
    { enabled: Boolean(customer?.user_id) },
  );
  const claimsQuery = useClaims();
  // `claim.customer_id` es el id de la cuenta (`user_id`) del cliente, no el de su perfil: se filtran los de esta ficha.
  const claims = useMemo(
    () => (claimsQuery.data ?? []).filter((claim) => claim.customer_id === customer?.user_id),
    [claimsQuery.data, customer?.user_id],
  );
  const openClaim = claims.find((claim) => claim.claim_id === claimId) ?? null;

  const handleDelete = async () => {
    if (!customer) return;
    const confirmed = await confirm({
      title: '¿Dar de baja al cliente?',
      text: `${customer.user?.full_name ?? 'El cliente'} no va a poder volver a entrar. Su historial de pedidos se conserva.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteCustomer.mutate(customer.customer_id, {
      onSuccess: () => {
        notify.success('Cliente dado de baja');
        navigate('/customers');
      },
      onError: notify.error,
    });
  };

  const name = customer?.user?.full_name ?? 'Sin nombre';
  const stats = orders.data ? customerStats(orders.data.orders, orders.data.total) : null;
  const coverStats: CoverStat[] = [
    {
      label: 'Total comprado',
      value: stats ? formatCurrency(stats.totalPurchased) : '–',
      hint: stats?.partial ? 'De sus últimos 100 pedidos' : 'Pedidos entregados',
    },
    { label: 'Pedidos', value: stats ? String(stats.ordersCount) : '–' },
    {
      label: 'Última compra',
      value: stats ? (stats.lastPurchaseAt ? formatDate(stats.lastPurchaseAt) : 'Sin pedidos') : '–',
    },
  ];

  const tabs: ProfileTabItem[] = [
    { key: 'summary', label: 'Resumen' },
    { key: 'orders', label: 'Pedidos', badge: stats?.ordersCount },
    { key: 'addresses', label: 'Direcciones', badge: addresses.data?.length },
    { key: 'cylinders', label: 'Envases en su poder', badge: heldCylinders.data?.total },
    { key: 'claims', label: 'Reclamos', badge: claimsQuery.data ? claims.length : undefined },
    { key: 'ratings', label: 'Calificaciones' },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader
        title="Ficha del cliente"
        breadcrumbs={[{ label: 'Clientes', to: '/customers', onClick: goBack }, { label: customer ? name : 'Cliente' }]}
        actions={
          customer &&
          canManageCustomerAccounts && (
            <>
              <Button variant="secondary" size="sm" icon={<PencilLine />} onClick={() => setEditing(true)}>
                Editar cuenta
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 />} onClick={() => void handleDelete()}>
                Dar de baja
              </Button>
            </>
          )
        }
      />

      {isPending ? (
        <ProfileSkeleton />
      ) : error || !customer ? (
        <ErrorState error={error} resource="El cliente" onRetry={() => void refetch()} />
      ) : (
        <>
          <PageCover
            avatar={<Avatar name={name} size="lg" />}
            title={name}
            subtitle={[customer.user?.email, customer.user?.phone_number].filter(Boolean).join(' · ') || undefined}
            badges={
              <>
                <Badge label={roleLabel(customer.user?.role?.type)} />
                {customer.user?.blocked && <Badge label={{ text: 'Cuenta bloqueada', tone: 'danger' }} />}
              </>
            }
            actions={
              <Button variant="secondary" size="sm" icon={<MapPin />} onClick={() => setEditingLocation(true)}>
                Editar ubicación
              </Button>
            }
            stats={coverStats}
          >
            <ProfileTabs tabs={tabs} value={tab} onChange={setTab} />
          </PageCover>

          <ProfileTabPanel tabKey="summary" value={tab}>
            <CustomerSummary customer={customer} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="orders" value={tab}>
            <CustomerOrders userId={customer.user_id} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="addresses" value={tab}>
            <CustomerAddresses userId={customer.user_id} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="cylinders" value={tab}>
            <CylinderLinksCard
              bare
              title="Envases en su poder"
              filters={{ customerUserId: customer.user_id }}
              emptyTitle="Sin envases en su poder"
              emptyDescription="Este cliente no tiene envases con número de serie a su nombre."
              listSearch={`customer=${customer.user_id}`}
            />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="claims" value={tab}>
            <CustomerClaims claims={claims} onOpen={(claim: Claim) => setClaimId(claim.claim_id)} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="ratings" value={tab}>
            <UserRatingsTab userId={customer.user_id} name={customer.user?.full_name} />
          </ProfileTabPanel>

          <CustomerLocationModal open={editingLocation} onClose={() => setEditingLocation(false)} customer={customer} />
          <ClaimDetailDrawer open={openClaim !== null} onClose={() => setClaimId(null)} claim={openClaim} />
        </>
      )}

      <CustomerFormModal open={editing} onClose={() => setEditing(false)} customer={customer ?? null} />
    </div>
  );
};
