import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { Role } from '../../../services/api/types';
import { useCreateRole, useUpdateRole } from '../../../services/queries/role';
import { notify } from '../../../utils/notifications';
import { roleSchema, type RoleFormValues } from './roleSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con rol es edición; sin rol, alta. */
  role: Role | null;
}

/**
 * CU-089: el catálogo de roles es exclusivo del administrador general. Un rol
 * fuera de los cuatro del sistema no habilita nada por sí mismo: los guards
 * del panel y de las apps chequean el rol contra un enum fijo, no contra esta
 * tabla (ver `RolesCard`).
 */
export const RoleFormModal = ({ open, onClose, role }: Props) => {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const saving = createRole.isPending || updateRole.isPending;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({ resolver: zodResolver(roleSchema) });

  useEffect(() => {
    if (open) reset({ type: role?.type ?? '' });
  }, [open, role, reset]);

  const onSubmit = handleSubmit(({ type }) => {
    const mutation = role
      ? updateRole.mutateAsync({ id: role.role_id, body: { type } })
      : createRole.mutateAsync({ type });
    mutation.then(() => {
      notify.success(role ? 'Rol actualizado' : 'Rol creado');
      onClose();
    }, notify.error);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? 'Editar rol' : 'Nuevo rol'}
      description="No condiciona ningún permiso del sistema: queda como dato informativo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" loading={saving}>
            {role ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={(e) => void onSubmit(e)} noValidate>
        <Input
          label="Nombre del rol"
          required
          placeholder="qa_pruebas"
          error={errors.type?.message}
          {...register('type')}
        />
      </form>
    </Modal>
  );
};
