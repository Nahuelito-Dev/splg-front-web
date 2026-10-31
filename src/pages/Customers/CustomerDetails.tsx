import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, PencilLine, Trash2 } from 'lucide-react';
import {
  AuditHistoryLink,
  Avatar,
  Badge,
  Button,
  Card,
  EntityPhoto,
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
import type { Claim } from '../../services/api/types';
import { useClaims } from '../../services/queries/claims';
import { useCustomer, useCustomerOrderSample, useRemoveCustomer } from '../../services/queries/customers';
import { useCustomerAccountOf } from '../../services/queries/finance';
import { useCylinders } from '../../services/queries/physicalCylinders';
import { useCustomerRepurchase } from '../../services/queries/repurchase';
import { useUserAddresses } from '../../services/queries/userAddresses';
import { formatCurrency, formatCurrencyExact, formatDate, formatNumber } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { ClaimDetailDrawer } from '../Claims/components/ClaimDetailDrawer';
import { CylinderLinksCard } from '../PhysicalCylinders/components/CylinderLinksCard';
import { CYLINDER_CARD_LIMIT } from '../PhysicalCylinders/cylinderFilters';
import { UserRatingsTab } from '../Ratings/components/UserRatingsTab';
import { roleLabel } from '../Users/roleLabel';
import { CustomerAccountAction } from '../Finance/components/CustomerAccountAction';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerAccountTab } from './components/details/CustomerAccountTab';
import { CustomerRecoveryCard } from './components/details/CustomerRecoveryCard';
import { CustomerAddresses } from './components/details/CustomerAddresses';
import { CustomerClaims } from './components/details/CustomerClaims';
import { CustomerLocationModal } from './components/details/CustomerLocationModal';
import { CustomerOrders } from './components/details/CustomerOrders';
import { CustomerRepurchase } from './components/details/CustomerRepurchase';
import { CustomerSummary } from './components/details/CustomerSummary';
import { removalConfirmation, removalError } from './customerRemoval';
import { customerStats } from './customerStats';
import { daysLeftText } from './Repurchase/repurchaseLabels';

/** El texto sale del valor real en centavos: un saldo de $ 0,004 se muestra $ 0,00 y está al día. */
const balanceHint = (balance: number): string => {
  const cents = Math.round(balance * 100);
  return cents > 0 ? 'El cliente debe' : cents < 0 ? 'Saldo a favor' : 'Al día';
};

const TAB_KEYS = ['summary', 'orders', 'addresses', 'cylinders', 'claims', 'account', 'repurchase', 'ratings'];

export const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/customers');
  const { canManageCustomerAccounts, needsDistributor, operateHint } = usePermissions();
  const { data: customer, isPending, error, refetch } = useCustomer(id);
  const removeCustomer = useRemoveCustomer();
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
  const accountQuery = useCustomerAccountOf(customer?.user_id, customer?.user?.full_name ?? undefined, {
    enabled: !needsDistributor,
  });
  const account = accountQuery.data;
  // Una cuenta bloqueada o dada de baja no se proyecta: ni se pregunta al back.
  const inactiveReason = customer?.user?.blocked
    ? 'blocked'
    : customer?.deletedAt || customer?.user?.deletedAt
      ? 'removed'
      : null;
  const repurchaseQuery = useCustomerRepurchase(customer?.user_id, { enabled: !needsDistributor && !inactiveReason });
  const nextRepurchase = repurchaseQuery.data?.forecast;
  const claimsQuery = useClaims();
  // `claim.customer_id` es el id de la cuenta (`user_id`) del cliente, no el de su perfil: se filtran los de esta ficha.
  const claims = useMemo(
    () => (claimsQuery.data ?? []).filter((claim) => claim.customer_id === customer?.user_id),
    [claimsQuery.data, customer?.user_id],
  );
  const openClaim = claims.find((claim) => claim.claim_id === claimId) ?? null;

  const handleDelete = async () => {
    if (!customer) return;
    const confirmed = await confirm(removalConfirmation(customer.user?.full_name));
    if (!confirmed) return;
    removeCustomer.mutate(customer.customer_id, {
      onSuccess: () => {
        notify.success('Cliente dado de baja');
        navigate('/customers');
      },
      onError: (error) => notify.error(removalError(error)),
    });
  };

  const name = customer?.user?.full_name ?? 'Sin nombre';
  useCrumbLeaf(customer ? name : undefined, goBack);
  const stats = orders.data ? customerStats(orders.data.orders, orders.data.total) : null;
  const consumption = customer?.avgMonthlyConsumptionKg;
  const coverStats: CoverStat[] = [
    {
      label: 'Total comprado',
      value: stats ? formatCurrency(stats.totalPurchased) : '–',
      hint: stats?.partial ? 'De sus últimos 100 pedidos' : 'Pedidos entregados',
    },
    { label: 'Pedidos', value: stats ? String(stats.ordersCount) : '–' },
    {
      label: 'Ticket promedio',
      value: stats ? (stats.averageTicket === null ? 'Sin entregas' : formatCurrencyExact(stats.averageTicket)) : '–',
      hint: stats?.partial && stats.averageTicket !== null ? 'De sus últimos 100 pedidos' : undefined,
    },
    {
      label: 'Última compra',
      value: stats ? (stats.lastPurchaseAt ? formatDate(stats.lastPurchaseAt) : 'Sin pedidos') : '–',
    },
    {
      label: 'Consumo declarado',
      value: consumption == null ? 'Sin declarar' : `${formatNumber(consumption)} kg/mes`,
    },
    {
      label: 'Próxima recompra',
      value: needsDistributor
        ? 'Elegí distribuidora'
        : inactiveReason
          ? 'No aplica'
          : repurchaseQuery.isError || repurchaseQuery.data === undefined
            ? '–'
            : nextRepurchase
              ? formatDate(nextRepurchase.estimatedAt)
              : 'Sin estimar',
      hint: nextRepurchase ? daysLeftText(nextRepurchase.daysLeft) : undefined,
    },
    {
      label: 'Cuenta corriente',
      value: needsDistributor
        ? 'Elegí distribuidora'
        : accountQuery.isError || account === undefined
          ? '–'
          : account
            ? formatCurrencyExact(account.balance)
            : 'Sin cuenta',
      hint: account ? balanceHint(account.balance) : undefined,
    },
  ];

  const tabs: ProfileTabItem[] = [
    { key: 'summary', label: 'Resumen' },
    { key: 'orders', label: 'Pedidos', badge: stats?.ordersCount },
    { key: 'addresses', label: 'Direcciones', badge: addresses.data?.length },
    { key: 'cylinders', label: 'Envases en su poder', badge: heldCylinders.data?.total },
    { key: 'claims', label: 'Reclamos', badge: claimsQuery.data ? claims.length : undefined },
    { key: 'account', label: 'Cuenta corriente' },
    { key: 'repurchase', label: 'Recompra' },
    { key: 'ratings', label: 'Calificaciones' },
  ];

  return (
    <PageContainer size="md">
      <PageHeader
        title="Ficha del cliente"
        actions={
          customer && (
            <>
              <AuditHistoryLink entity="Customer" recordId={customer.customer_id} />
              <CustomerAccountAction userId={customer.user_id} name={customer.user?.full_name ?? ''} />
              {canManageCustomerAccounts && (
                <Button variant="secondary" size="sm" icon={<PencilLine />} onClick={() => setEditing(true)}>
                  Editar cuenta
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 />}
                blockedReason={operateHint}
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
      ) : error || !customer ? (
        <ErrorState error={error} resource="El cliente" onRetry={() => void refetch()} />
      ) : (
        <>
          <PageCover
            avatar={
              <PhotoThumb
                kind="user"
                id={customer.user_id}
                url={customer.user?.photoUrl}
                size="lg"
                fallback={<Avatar name={name} size="lg" />}
              />
            }
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
            <div className="space-y-6">
              <Card className="p-6">
                <EntityPhoto
                  kind="user"
                  id={customer.user_id}
                  url={customer.user?.photoUrl}
                  subject="de perfil"
                  canEdit={canManageCustomerAccounts}
                  className="max-w-md"
                />
              </Card>
              <CustomerSummary customer={customer} />
            </div>
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="orders" value={tab}>
            <CustomerOrders userId={customer.user_id} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="addresses" value={tab}>
            <CustomerAddresses userId={customer.user_id} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="cylinders" value={tab}>
            <CylinderLinksCard
              title="Envases en su poder"
              filters={{ customerUserId: customer.user_id }}
              emptyTitle="Sin envases en su poder"
              emptyDescription="Este cliente no tiene envases con número de serie a su nombre."
              listSearch={`customer=${customer.user_id}`}
            />
            {!needsDistributor && (
              <div className="mt-6">
                <CustomerRecoveryCard userId={customer.user_id} />
              </div>
            )}
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="claims" value={tab}>
            <CustomerClaims claims={claims} onOpen={(claim: Claim) => setClaimId(claim.claim_id)} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="account" value={tab}>
            <CustomerAccountTab
              userId={customer.user_id}
              name={name}
              account={account}
              needsDistributor={needsDistributor}
              loading={accountQuery.isPending}
              error={accountQuery.error}
              onRetry={() => void accountQuery.refetch()}
            />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="repurchase" value={tab}>
            <CustomerRepurchase
              needsDistributor={needsDistributor}
              inactive={inactiveReason}
              loading={repurchaseQuery.isPending}
              error={repurchaseQuery.error}
              onRetry={() => void repurchaseQuery.refetch()}
              data={repurchaseQuery.data}
            />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="ratings" value={tab}>
            <UserRatingsTab userId={customer.user_id} name={customer.user?.full_name} />
          </ProfileTabPanel>

          <CustomerLocationModal open={editingLocation} onClose={() => setEditingLocation(false)} customer={customer} />
          <ClaimDetailDrawer open={openClaim !== null} onClose={() => setClaimId(null)} claim={openClaim} />
        </>
      )}

      <CustomerFormModal open={editing} onClose={() => setEditing(false)} customer={customer ?? null} />
    </PageContainer>
  );
};
