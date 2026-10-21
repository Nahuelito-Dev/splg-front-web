import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftRight, Ban, CircleCheck, Pencil, Trash2 } from 'lucide-react';
import {
  AuditHistoryLink,
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  EmptyState,
  EntityPhoto,
  ErrorState,
  PageHeader,
  PageContainer,
  type MenuAction,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { activeDistributor } from '../../services/api/activeDistributor';
import { useDistributor } from '../../services/queries/distributors';
import { formatDateTime } from '../../utils/format';
import { DISTRIBUTOR_STATUS, labelOf } from '../../utils/statusLabels';
import { DistributorAdmins } from './components/DistributorAdmins';
import { DistributorFormModal } from './components/DistributorFormModal';
import { useDistributorActions } from './useDistributorActions';

/** La ficha de una empresa (`GET /distributor/:id`), sólo para el administrador general. */
export const DistributorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/distributors');
  const { isSuperAdmin } = usePermissions();
  const { data: distributor, isPending, error, refetch } = useDistributor(id, isSuperAdmin);
  useCrumbLeaf(distributor?.name, goBack);
  const { toggleStatus, remove } = useDistributorActions({ onDeleted: () => navigate('/distributors') });
  const [editing, setEditing] = useState(false);

  const viewAs = (slug: string) => {
    activeDistributor.set(slug);
    window.location.reload();
  };

  if (!isSuperAdmin) {
    return (
      <PageContainer>
        <EmptyState title="Sin acceso" description="Sólo el administrador general ve las distribuidoras." />
      </PageContainer>
    );
  }

  const isViewing = distributor ? activeDistributor.get() === distributor.slug : false;

  // La primaria es entrar a operar la empresa («Ver como»); el resto de la gestión va al menú ⋮.
  const headerPrimary = distributor ? (
    <>
      <AuditHistoryLink entity="Distributor" recordId={distributor.distributor_id} />
      {isViewing ? (
        <span className="self-center px-2 text-xs font-semibold text-primary-strong">Viendo como esta empresa</span>
      ) : (
        <Button size="sm" icon={<ArrowLeftRight />} onClick={() => viewAs(distributor.slug)}>
          Ver como
        </Button>
      )}
    </>
  ) : undefined;
  const headerSecondary: MenuAction[] = distributor
    ? [
        { label: 'Editar', icon: <Pencil />, onClick: () => setEditing(true) },
        distributor.status === 'active'
          ? { label: 'Suspender', icon: <Ban />, onClick: () => void toggleStatus(distributor) }
          : { label: 'Activar', icon: <CircleCheck />, onClick: () => void toggleStatus(distributor) },
        { label: 'Dar de baja', icon: <Trash2 />, tone: 'danger' as const, onClick: () => void remove(distributor) },
      ]
    : [];

  return (
    <PageContainer>
      <PageHeader title="Ficha de la empresa" actions={headerPrimary} secondaryActions={headerSecondary} />

      {isPending ? (
        <DetailSkeleton />
      ) : error || !distributor ? (
        <ErrorState error={error} resource="La empresa" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-ink">{distributor.name}</h2>
                <p className="truncate font-mono text-sm text-muted">{distributor.slug}</p>
              </div>
              <Badge label={labelOf(DISTRIBUTOR_STATUS, distributor.status)} variant="critical" />
            </div>
            <EntityPhoto
              kind="distributor"
              id={distributor.distributor_id}
              url={distributor.photoUrl ?? distributor.logo_url}
              subject="de la empresa"
              label="Logo"
              fit="contain"
              canEdit
              className="mt-5 border-t border-outline pt-5"
            />
            <DetailList
              className="mt-5 border-t border-outline pt-5"
              items={[
                { label: 'Razón social', value: distributor.legal_name ?? '—', wide: true },
                { label: 'CUIT', value: distributor.tax_id ?? '—', mono: true },
                { label: 'Teléfono', value: distributor.phone ?? '—', mono: true },
                { label: 'Email', value: distributor.email ?? '—', wide: true },
                { label: 'Plan', value: distributor.plan ?? 'Sin plan asignado' },
                { label: 'Alta', value: formatDateTime(distributor.createdAt) },
                { label: 'Última modificación', value: formatDateTime(distributor.updatedAt) },
                { label: 'Id', value: distributor.distributor_id, mono: true, wide: true },
              ]}
            />
          </Card>

          <div className="min-w-0 lg:col-span-2">
            <DistributorAdmins distributorId={distributor.distributor_id} />
          </div>
        </div>
      )}

      <DistributorFormModal open={editing} onClose={() => setEditing(false)} distributor={distributor ?? null} />
    </PageContainer>
  );
};
