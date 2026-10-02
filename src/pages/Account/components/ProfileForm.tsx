import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Input } from '../../../common/components/ui';
import type { User } from '../../../services/api/types';
import { useUpdateUserAccount } from '../../../services/queries/users';
import { notify } from '../../../utils/notifications';
import { profileSchema, type ProfileValues } from './accountSchemas';

/** Datos generales de la cuenta propia: nombre y teléfono (PATCH /users/:id). */
export const ProfileForm = ({ user }: { user: User }) => {
  const updateAccount = useUpdateUserAccount();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    reset({ full_name: user.full_name ?? '', phone_number: user.phone_number ?? '' });
  }, [user, reset]);

  const onSubmit = handleSubmit((values) =>
    updateAccount.mutate(
      { userId: user.user_id, changes: values },
      { onSuccess: () => notify.success('Datos actualizados'), onError: notify.error },
    ),
  );

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-ink">Datos generales</h2>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Nombre completo"
          required
          autoComplete="name"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label="Teléfono"
          required
          type="tel"
          placeholder="+5493764000000"
          error={errors.phone_number?.message}
          {...register('phone_number')}
        />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={!isDirty} loading={updateAccount.isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
};
