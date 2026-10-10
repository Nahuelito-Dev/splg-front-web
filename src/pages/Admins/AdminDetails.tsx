import { Link, useParams } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import {
  AuditHistoryLink,
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageHeader,
} from '../../common/components/ui';
import { useCrumbLeaf } from '../../common/components';
import { useBackToList } from '../../hooks';
import { useAdmin } from '../../services/queries/admins';
import { formatDateTime } from '../../utils/format';
import { roleLabel } from '../Users/roleLabel';

/**
 * La ficha de un administrador (`GET /admin/:id`): su cuenta, su rol y su empresa. La API no tiene edición ni baja
 * de «admin» como recurso: la cuenta (datos, bloqueo, baja) se administra desde la ficha del usuario.
 */
export const AdminDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/admins');
  const { data: admin, isPending, error, refetch } = useAdmin(id);
  useCrumbLeaf(admin?.user?.full_name ?? undefined, goBack);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <PageHeader
        title="Ficha del administrador"
        actions={
          admin && (
            <>
              <AuditHistoryLink entity="Admin" recordId={admin.admin_id} />
              <Link to={`/users/details/${admin.user_id}`}>
                <Button variant="secondary" size="sm" icon={<UserCog />}>
                  Administrar la cuenta
                </Button>
              </Link>
            </>
          )
        }
      />

      {isPending ? (
        <DetailSkeleton />
      ) : error || !admin ? (
        <ErrorState error={error} resource="El administrador" onRetry={() => void refetch()} />
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink">{admin.user?.full_name ?? 'Sin nombre'}</h2>
              <p className="text-sm text-muted">{admin.user?.email ?? 'Sin correo'}</p>
            </div>
            <Badge label={roleLabel(admin.user?.role?.type ?? admin.role?.type)} />
          </div>
          <DetailList
            className="mt-5 border-t border-outline pt-5"
            items={[
              { label: 'Teléfono', value: admin.user?.phone_number ?? '—' },
              { label: 'Empresa', value: admin.distributor?.name ?? 'Plataforma' },
              { label: 'Estado de la cuenta', value: admin.user?.blocked ? 'Bloqueada' : 'Activa' },
              { label: 'Alta como administrador', value: formatDateTime(admin.createdAt) },
              { label: 'ID del administrador', value: admin.admin_id, mono: true, wide: true },
              { label: 'ID del usuario', value: admin.user_id, mono: true, wide: true },
            ]}
          />
        </Card>
      )}
    </div>
  );
};
