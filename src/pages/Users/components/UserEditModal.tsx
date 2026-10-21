import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { accountFields, newPassword } from '../../../common/forms/accountSchema';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import type { User } from '../../../services/api/types';
import { useUpdateUserAccount } from '../../../services/queries/users';
import { notify } from '../../../utils/notifications';

/** La contraseña nueva es opcional: en blanco, no se toca. */
const editSchema = z
  .object({
    ...accountFields,
    password: z.union([z.literal(''), newPassword]),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type EditValues = z.infer<typeof editSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserEditModal = ({ open, onClose, user }: Props) => {
  const updateAccount = useUpdateUserAccount();
  const methods = useForm<EditValues>({ resolver: zodResolver(editSchema) });
  const {
    reset,
    formState: { isDirty },
  } = methods;

  useEffect(() => {
    if (open && user) {
      reset({
        full_name: user.full_name ?? '',
        phone_number: user.phone_number ?? '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [open, user, reset]);

  if (!user) return null;

  const onSubmit = ({ full_name, phone_number, password }: EditValues) =>
    updateAccount.mutate(
      { userId: user.user_id, changes: { full_name, phone_number, ...(password && { password }) } },
      {
        onSuccess: () => {
          notify.success('Cuenta actualizada');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar cuenta"
      description={user.email ?? undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="user-edit" loading={updateAccount.isPending} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <Form methods={methods} id="user-edit" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormInput name="full_name" label="Nombre completo" required autoComplete="name" />
        <FormInput name="phone_number" label="Teléfono" required type="tel" />
        <fieldset className="grid gap-4 rounded-xl border border-outline p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium text-ink">Contraseña nueva (opcional)</legend>
          <FormInput name="password" label="Contraseña nueva" type="password" autoComplete="new-password" />
          <FormInput name="confirmPassword" label="Repetir contraseña" type="password" autoComplete="new-password" />
        </fieldset>
      </Form>
    </Modal>
  );
};
