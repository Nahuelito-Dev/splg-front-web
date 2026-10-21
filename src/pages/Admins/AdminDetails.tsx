import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, UserCog } from 'lucide-react';
import {
  AuditHistoryLink,
  Avatar,
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageHeader,
  PhotoThumb,
  PageContainer,
  type MenuAction,
} from '../../common/components/ui';
import { useCrumbLeaf } from '../../common/components';
import { useBackToList } from '../../hooks';
import { useAdmin } from '../../services/queries/admins';
import { formatDateTime } from '../../utils/format';
import { roleLabel } from '../Users/roleLabel';
import { EditAdminModal } from './components/EditAdminModal';
import { useAdminManagement } from './useAdminManagement';

/**
 * La ficha de un administrador (`GET /admin/:id`): su cuenta, su rol y su empresa. Se edita (nombre y teléfono) y se da
 * de baja desde acá; el bloqueo y el correo se administran desde la ficha del usuario.
 */
export const AdminDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/admins');
  // Tras la baja la ficha ya no existe: no se vuelve a pedir mientras se navega a la lista.
  const [removed, setRemoved] = useState(false);
  const { data: admin, isPending, error, refetch } = useAdmin(removed ? undefined : id);
  useCrumbLeaf(admin?.user?.full_name ?? undefined, goBack);
  const [editing, setEditing] = useState(false);
  const { stateOf, remove, blockedReason } = useAdminManagement();
  const state = admin ? stateOf(admin) : null;
  const navigate = useNavigate();

  // La primaria es editar; administrar la cuenta y la baja van al menú ⋮.
  const headerPrimary = admin ? (
    <>
      <AuditHistoryLink entity="Admin" recordId={admin.admin_id} />
      {state && state.edit !== 'hidden' && (
        <Button
          size="sm"
          icon={<Pencil />}
          blockedReason={state.edit === 'needs-distributor' ? blockedReason : undefined}
          onClick={() => setEditing(true)}
        >
          Editar
        </Button>
      )}
    </>
  ) : undefined;
  const headerSecondary: MenuAction[] = admin
    ? [
        {
          label: 'Administrar la cuenta',
          icon: <UserCog />,
          onClick: () => navigate(`/users/details/${admin.user_id}`),
        },
        ...(state && state.remove !== 'hidden'
          ? [
              {
                label: 'Dar de baja',
                icon: <Trash2 />,
                tone: 'danger' as const,
                blockedReason: state.remove === 'needs-distributor' ? blockedReason : undefined,
                onClick: () =>
                  void remove(admin, () => {
                    setRemoved(true);
                    goBack();
                  }),
              },
            ]
          : []),
      ]
    : [];

  return (
    <PageContainer size="md">
      <PageHeader title="Ficha del administrador" actions={headerPrimary} secondaryActions={headerSecondary} />

      {isPending ? (
        <DetailSkeleton />
      ) : error || !admin ? (
        <ErrorState error={error} resource="El administrador" onRetry={() => void refetch()} />
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <PhotoThumb
                kind="user"
                id={admin.user_id}
                url={admin.user?.photoUrl}
                size="lg"
                fallback={<Avatar name={admin.user?.full_name ?? '?'} size="lg" />}
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-ink">{admin.user?.full_name ?? 'Sin nombre'}</h2>
                <p className="text-sm text-muted">{admin.user?.email ?? 'Sin correo'}</p>
              </div>
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
      <EditAdminModal admin={editing ? (admin ?? null) : null} onClose={() => setEditing(false)} />
    </PageContainer>
  );
};
