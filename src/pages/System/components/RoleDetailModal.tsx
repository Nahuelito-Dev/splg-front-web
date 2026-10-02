import { Badge, DetailList, DetailSkeleton, ErrorState, Modal } from '../../../common/components/ui';
import { useRole } from '../../../services/queries/role';
import { formatDateTime } from '../../../utils/format';

interface Props {
  /** Id del rol a mostrar; `null` cierra el modal. */
  roleId: string | null;
  onClose: () => void;
  isSystemRole: (type: string) => boolean;
}

const RoleBody = ({ roleId, isSystemRole }: { roleId: string; isSystemRole: Props['isSystemRole'] }) => {
  const { data: role, isPending, error, refetch } = useRole(roleId);
  if (isPending) return <DetailSkeleton />;
  if (error || !role) return <ErrorState error={error} resource="El rol" onRetry={() => void refetch()} />;
  return (
    <div className="space-y-4">
      <Badge
        label={
          isSystemRole(role.type) ? { text: 'Del sistema', tone: 'info' } : { text: 'Personalizado', tone: 'neutral' }
        }
      />
      <DetailList
        items={[
          { label: 'Nombre', value: role.type, mono: true, wide: true },
          { label: 'Alta', value: formatDateTime(role.createdAt) },
          { label: 'Última modificación', value: formatDateTime(role.updatedAt) },
          { label: 'Id', value: role.role_id, mono: true, wide: true },
        ]}
      />
    </div>
  );
};

/** El detalle de un rol (`GET /role/:id`), sólo para el administrador general. */
export const RoleDetailModal = ({ roleId, onClose, isSystemRole }: Props) => (
  <Modal open={Boolean(roleId)} onClose={onClose} size="sm" title="Rol">
    {roleId && <RoleBody roleId={roleId} isSystemRole={isSystemRole} />}
  </Modal>
);
