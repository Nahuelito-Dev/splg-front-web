import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  ErrorState,
  PageContainer,
  PageHeader,
  TableSkeleton,
  TableToolbar,
  type FilterChip,
} from '../../common/components/ui';
import { useAppSelector, useDebounce, usePermiso, usePermissions, useUrlParam } from '../../hooks';
import type { StaffRole } from '../../services/api/types';
import { useMyPermissions } from '../../services/queries/permissions';
import { useDeleteStaffRole, useStaffRoles } from '../../services/queries/staffRoles';
import { confirm, notify } from '../../utils/notifications';
import { StaffRoleModal } from './components/StaffRoleModal';
import { StaffRolesTable } from './components/StaffRolesTable';
import { matchesStaffRole, type StaffRoleViewer } from './staffRoleAccess';

/** F37: los roles del personal de la distribuidora y qué permisos da cada uno. */
export const StaffRoles = () => {
  const manage = usePermiso('roles.gestionar');
  const { writeHint } = usePermissions();
  const email = useAppSelector((state) => state.auth.email);
  const ownRoleId = useMyPermissions(email).data?.staffRole?.staffRoleId ?? null;
  const roles = useStaffRoles();
  const { mutate: removeRole } = useDeleteStaffRole();
  const [editing, setEditing] = useState<StaffRole | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  // La búsqueda vive en la URL: al recargar, la lista queda como estaba. La API devuelve todos los roles: se filtra acá.
  const [search, setSearch] = useUrlParam('q', '');
  const term = useDebounce(search.trim());
  const rows = useMemo(() => (roles.data ?? []).filter((role) => matchesStaffRole(role, term)), [roles.data, term]);
  const chips: FilterChip[] = search.trim() ? [{ key: 'q', label: `"${search.trim()}"` }] : [];
  const viewer = useMemo<StaffRoleViewer>(
    () => ({ canManage: manage.allowed, writeHint, ownRoleId }),
    [manage.allowed, writeHint, ownRoleId],
  );

  const onDelete = useCallback(
    async (role: StaffRole) => {
      const ok = await confirm({
        title: '¿Dar de baja este rol?',
        text: `El rol «${role.name}» deja de estar disponible para asignar. Su historial se conserva.`,
        confirmText: 'Dar de baja',
        danger: true,
      });
      if (!ok) return;
      removeRole(role.staffRoleId, { onSuccess: () => notify.success('Rol dado de baja'), onError: notify.error });
    },
    [removeRole],
  );
  const handleDelete = useCallback((role: StaffRole) => void onDelete(role), [onDelete]);

  return (
    <PageContainer>
      <PageHeader
        title="Roles del personal"
        description="Definí qué puede hacer cada administrador de la distribuidora."
        actions={
          manage.allowed ? (
            <Button icon={<Plus />} onClick={() => setCreateOpen(true)} blockedReason={writeHint}>
              Nuevo rol
            </Button>
          ) : undefined
        }
      />
      <Card>
        {roles.isLoading ? (
          <TableSkeleton columns={5} />
        ) : roles.error ? (
          <ErrorState error={roles.error} resource="Los roles" onRetry={() => void roles.refetch()} />
        ) : (
          <>
            <TableToolbar
              search={{
                label: 'Buscar roles',
                placeholder: 'Nombre o descripción',
                value: search,
                onChange: setSearch,
              }}
              chips={chips}
              onRemoveChip={() => setSearch('')}
              onClearChips={() => setSearch('')}
              resultCount={rows.length}
              noun={['rol', 'roles']}
            />
            <StaffRolesTable
              rows={rows}
              loading={roles.isFetching}
              filtered={chips.length > 0}
              viewer={viewer}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          </>
        )}
      </Card>
      <StaffRoleModal open={createOpen} role={null} onClose={() => setCreateOpen(false)} />
      <StaffRoleModal open={editing !== null} role={editing} onClose={() => setEditing(null)} />
    </PageContainer>
  );
};
