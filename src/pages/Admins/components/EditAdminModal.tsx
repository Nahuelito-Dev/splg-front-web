import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { accountFields } from '../../../common/forms/accountSchema';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { Admin } from '../../../services/api/types';
import { useUpdateAdmin } from '../../../services/queries/admins';
import { notify } from '../../../utils/notifications';

/** El teléfono es opcional al editar, como en la API: un admin sin teléfono puede guardar sólo el nombre. */
const editSchema = z.object({
  full_name: accountFields.full_name,
  phone_number: z.union([z.literal(''), accountFields.phone_number]),
});

type EditValues = z.infer<typeof editSchema>;

interface Props {
  admin: Admin | null;
  onClose: () => void;
}

/** Nombre y teléfono del administrador (`PATCH /admin/:id`). El correo y el bloqueo se cambian desde su cuenta. */
export const EditAdminModal = ({ admin, onClose }: Props) => {
  const updateAdmin = useUpdateAdmin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (admin) reset({ full_name: admin.user?.full_name ?? '', phone_number: admin.user?.phone_number ?? '' });
  }, [admin, reset]);

  const onSubmit = handleSubmit(({ full_name, phone_number }) => {
    if (!admin) return;
    updateAdmin.mutate(
      { id: admin.admin_id, body: { fullName: full_name, ...(phone_number && { phoneNumber: phone_number }) } },
      {
        onSuccess: () => {
          notify.success('Administrador actualizado');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={admin !== null}
      onClose={onClose}
      title="Editar administrador"
      description={admin?.user?.email ?? undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="admin-edit" loading={updateAdmin.isPending} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="admin-edit" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Nombre completo"
          required
          autoComplete="name"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label="Teléfono"
          type="tel"
          placeholder="+5493764000000"
          error={errors.phone_number?.message}
          {...register('phone_number')}
        />
      </form>
    </Modal>
  );
};
