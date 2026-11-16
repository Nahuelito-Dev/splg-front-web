import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardHeader, FormInput, Form } from '../../../common/components/ui';
import type { User } from '../../../services/api/types';
import { useUpdateUserAccount } from '../../../services/queries/users';
import { notify } from '../../../utils/notifications';
import { profileSchema, type ProfileValues } from './accountSchemas';

/** Datos generales de la cuenta propia: nombre y teléfono (PATCH /users/:id). */
export const ProfileForm = ({ user }: { user: User }) => {
  const updateAccount = useUpdateUserAccount();
  const methods = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const {
    reset,
    formState: { isDirty },
  } = methods;

  useEffect(() => {
    reset({ full_name: user.full_name ?? '', phone_number: user.phone_number ?? '' });
  }, [user, reset]);

  const onSubmit = (values: ProfileValues) =>
    updateAccount.mutate(
      { userId: user.user_id, changes: values },
      { onSuccess: () => notify.success('Datos actualizados'), onError: notify.error },
    );

  return (
    <Card className="p-6">
      <CardHeader title="Datos generales" className="" />
      <Form methods={methods} onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormInput name="full_name" label="Nombre completo" required autoComplete="name" />
        <FormInput name="phone_number" label="Teléfono" required type="tel" placeholder="+5493764000000" />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={!isDirty} loading={updateAccount.isPending}>
            Guardar cambios
          </Button>
        </div>
      </Form>
    </Card>
  );
};
