import { RefreshCw } from 'lucide-react';
import { Button, Card, ErrorState, IdentityCell, LoadingState } from '../../../common/components/ui';
import { useRoles, useSeedRoles } from '../../../services/queries/role';
import { formatDateTime } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';

/**
 * Los 4 roles que el código busca por nombre (`admin`, `super_admin`,
 * `customer`, `delivery`): sin ellos el registro de usuarios falla con
 * "Customer role not found" (ver `RoleService.ROLES_DEL_SISTEMA`).
 */
const SYSTEM_ROLES = ['admin', 'super_admin', 'customer', 'delivery'];

/**
 * Sólo lectura + "crear los que falten": el back permite crear roles con
 * cualquier nombre (`POST /role`) y editarlos o borrarlos si no son de los 4
 * del sistema, pero no tiene ningún uso funcional acá — los guards del panel
 * y de las apps chequean el rol contra el enum fijo `RoleType`, no contra
 * esta tabla, así que un rol nuevo no habilita nada y un usuario con un rol
 * que no sea uno de los 4 ni siquiera puede iniciar sesión (`AuthGuard`
 * rechaza cualquier otro rol al validar la app de origen). Por eso el panel
 * no ofrece un alta libre de roles: sería una función sin ningún efecto real.
 */
export const RolesCard = () => {
  const { data: roles, isLoading, error, refetch } = useRoles();
  const seedRoles = useSeedRoles();

  const handleSeed = async () => {
    const confirmed = await confirm({
      title: '¿Crear los roles del sistema que falten?',
      text: `Crea los que falten de: ${SYSTEM_ROLES.join(', ')}. Los que ya existen no se tocan.`,
      confirmText: 'Crear',
    });
    if (!confirmed) return;
    seedRoles.mutate(undefined, { onSuccess: () => notify.success('Roles del sistema al día'), onError: notify.error });
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Roles del sistema</h3>
          <p className="text-xs text-muted">
            Sólo lectura: {SYSTEM_ROLES.join(', ')} son los que el código necesita para funcionar.
          </p>
        </div>
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

      {isLoading ? (
        <LoadingState label="Cargando roles…" />
      ) : error ? (
        <ErrorState error={error} resource="Los roles" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-1.5">
          {(roles ?? []).map((role) => (
            <div
              key={role.role_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-tinta-50 px-3.5 py-2.5"
            >
              <IdentityCell title={role.type} subtitle={role.role_id} monoSubtitle />
              <span className="text-xs text-muted">
                {SYSTEM_ROLES.includes(role.type) ? 'Del sistema' : 'Personalizado'} · {formatDateTime(role.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
