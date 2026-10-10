import { useState } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Card, ErrorState, IconButton, IdentityCell, LoadingState } from '../../../common/components/ui';
import type { Role } from '../../../services/api/types';
import { useDeleteRole, useRoles, useSeedRoles } from '../../../services/queries/role';
import { formatDateTime } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { RoleDetailModal } from './RoleDetailModal';
import { RoleFormModal } from './RoleFormModal';

/**
 * Los 4 roles que el código busca por nombre (`admin`, `super_admin`,
 * `customer`, `delivery`): sin ellos el registro de usuarios falla con
 * "Customer role not found" (ver `RoleService.ROLES_DEL_SISTEMA`).
 */
const SYSTEM_ROLES = ['admin', 'super_admin', 'customer', 'delivery'];

type FormState = { open: false } | { open: true; role: Role | null };

/**
 * CU-089: el administrador general puede crear, editar y borrar roles. Los
 * cuatro del sistema no se tocan desde acá (editarlos o borrarlos rompe el
 * registro de usuarios); un rol nuevo, además, no habilita nada por sí
 * mismo porque los guards del panel y de las apps chequean el rol contra un
 * enum fijo, no contra esta tabla.
 */
export const RolesCard = () => {
  const { data: roles, isLoading, error, refetch } = useRoles();
  const seedRoles = useSeedRoles();
  const deleteRole = useDeleteRole();
  const [form, setForm] = useState<FormState>({ open: false });
  const [detailId, setDetailId] = useState<string | null>(null);

  const handleSeed = async () => {
    const confirmed = await confirm({
      title: '¿Crear los roles del sistema que falten?',
      text: `Crea los que falten de: ${SYSTEM_ROLES.join(', ')}. Los que ya existen no se tocan.`,
      confirmText: 'Crear',
    });
    if (!confirmed) return;
    seedRoles.mutate(undefined, { onSuccess: () => notify.success('Roles del sistema al día'), onError: notify.error });
  };

  const handleDelete = async (role: Role) => {
    const confirmed = await confirm({
      title: '¿Dar de baja el rol?',
      text: `Baja lógica: "${role.type}" no se borra. Si tiene usuarios asignados o es del sistema, la API lo rechaza.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteRole.mutate(role.role_id, {
      onSuccess: () => notify.success('Rol dado de baja'),
      onError: notify.error,
    });
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Roles del sistema</h3>
          <p className="text-xs text-muted">
            {SYSTEM_ROLES.join(', ')} son los que el código necesita para funcionar y no se editan desde acá.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => setForm({ open: true, role: null })}>
            Nuevo rol
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw />}
            loading={seedRoles.isPending}
            onClick={() => void handleSeed()}
          >
            Crear los que falten
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Cargando roles…" />
      ) : error ? (
        <ErrorState error={error} resource="Los roles" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-1.5">
          {(roles ?? []).map((role) => {
            const isSystemRole = SYSTEM_ROLES.includes(role.type);
            return (
              <div
                key={role.role_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-surface-hover px-3.5 py-2.5"
              >
                <IdentityCell title={role.type} subtitle={role.role_id} monoSubtitle />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {isSystemRole ? 'Del sistema' : 'Personalizado'} · {formatDateTime(role.createdAt)}
                  </span>
                  <div className="flex gap-1.5">
                    <IconButton
                      label={`Ver detalle de ${role.type}`}
                      icon={<Eye />}
                      onClick={() => setDetailId(role.role_id)}
                    />
                    {!isSystemRole && (
                      <>
                        <IconButton
                          label={`Editar ${role.type}`}
                          icon={<Pencil />}
                          onClick={() => setForm({ open: true, role })}
                        />
                        <IconButton
                          label={`Dar de baja ${role.type}`}
                          icon={<Trash2 />}
                          tone="danger"
                          onClick={() => void handleDelete(role)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoleDetailModal
        roleId={detailId}
        onClose={() => setDetailId(null)}
        isSystemRole={(type) => SYSTEM_ROLES.includes(type)}
      />
      <RoleFormModal open={form.open} onClose={() => setForm({ open: false })} role={form.open ? form.role : null} />
    </Card>
  );
};
