import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorState, Form, FormSelect, LoadingState, Modal } from '../../../common/components/ui';
import { useAppSelector } from '../../../hooks';
import type { Admin } from '../../../services/api/types';
import { useMyPermissions } from '../../../services/queries/permissions';
import { useAssignStaffRole, useStaffRoles } from '../../../services/queries/staffRoles';
import { notify } from '../../../utils/notifications';
import { NOT_HELD_ROLE_HINT, canGrant } from '../staffRoleRules';

interface Props {
  admin: Admin | null;
  onClose: () => void;
}
const schema = z.object({ staffRoleId: z.string().uuid('Elegí un rol válido') });
type Values = z.infer<typeof schema>;

export const AssignStaffRoleModal = ({ admin, onClose }: Props) => {
  const roles = useStaffRoles(admin !== null);
  const email = useAppSelector((state) => state.auth.email);
  const mine = useMyPermissions(email).data;
  const assign = useAssignStaffRole();
  const methods = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { staffRoleId: '' } });
  useEffect(() => {
    methods.reset({ staffRoleId: admin?.staffRole?.staffRoleId ?? '' });
  }, [admin, methods]);
  const onSubmit = ({ staffRoleId }: Values) => {
    if (!admin) return;
    // El mismo rol que ya tiene no cambia nada: no se manda.
    if (staffRoleId === admin.staffRole?.staffRoleId) {
      notify.info('Sin cambios');
      onClose();
      return;
    }
    assign.mutate(
      { adminId: admin.admin_id, body: { staffRoleId } },
      {
        onSuccess: () => {
          notify.success('Rol asignado');
          onClose();
        },
        onError: notify.error,
      },
    );
  };
  return (
    <Modal
      open={admin !== null}
      onClose={onClose}
      title="Cambiar rol del personal"
      description={admin?.user?.full_name ?? undefined}
      closeBlocked={assign.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={assign.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="assign-staff-role" loading={assign.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      {roles.isLoading ? (
        <LoadingState />
      ) : roles.error ? (
        <ErrorState error={roles.error} resource="Los roles" onRetry={() => void roles.refetch()} />
      ) : (
        <Form methods={methods} id="assign-staff-role" onSubmit={onSubmit}>
          <FormSelect
            name="staffRoleId"
            label="Rol"
            required
            options={(roles.data ?? []).map((role) => {
              const grantable = canGrant(role, mine);
              return {
                value: role.staffRoleId,
                label: grantable ? role.name : `${role.name} (${NOT_HELD_ROLE_HINT})`,
                disabled: !grantable,
              };
            })}
          />
        </Form>
      )}
    </Modal>
  );
};
