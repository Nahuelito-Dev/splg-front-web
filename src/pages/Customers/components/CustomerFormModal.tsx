import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  accountFields,
  newAccountSchema,
  newPassword,
  type NewAccountValues,
} from '../../../common/forms/accountSchema';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { Customer } from '../../../services/api/types';
import { useCreateCustomer, useUpdateCustomerAccount } from '../../../services/queries/customers';
import { notify } from '../../../utils/notifications';

/** Edición de la cuenta: la contraseña nueva es opcional. */
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
  /** Con cliente es edición de la cuenta; sin cliente, alta. */
  customer: Customer | null;
}

export const CustomerFormModal = ({ open, onClose, customer }: Props) =>
  customer ? (
    <EditCustomerForm open={open} onClose={onClose} customer={customer} />
  ) : (
    <CreateCustomerForm open={open} onClose={onClose} />
  );

const CreateCustomerForm = ({ open, onClose }: Omit<Props, 'customer'>) => {
  const createCustomer = useCreateCustomer();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewAccountValues>({ resolver: zodResolver(newAccountSchema) });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = handleSubmit(({ confirmPassword: _, ...account }) =>
    createCustomer.mutate(account, {
      onSuccess: () => {
        notify.success('Cliente creado');
        onClose();
      },
      onError: notify.error,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo cliente"
      description="Se crea la cuenta con la que el cliente entra a la app."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-create" loading={createCustomer.isPending}>
            Crear cliente
          </Button>
        </>
      }
    >
      <form id="customer-create" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
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
        <div className="sm:col-span-2">
          <Input
            label="Email"
            required
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <Input
          label="Contraseña"
          required
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Repetir contraseña"
          required
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </form>
    </Modal>
  );
};

const EditCustomerForm = ({ open, onClose, customer }: Omit<Props, 'customer'> & { customer: Customer }) => {
  const updateAccount = useUpdateCustomerAccount();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (open) {
      reset({
        full_name: customer.user?.full_name ?? '',
        phone_number: customer.user?.phone_number ?? '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [open, customer, reset]);

  const onSubmit = handleSubmit(({ full_name, phone_number, password }) =>
    updateAccount.mutate(
      {
        userId: customer.user_id,
        changes: { full_name, phone_number, ...(password && { password }) },
      },
      {
        onSuccess: () => {
          notify.success('Cuenta del cliente actualizada');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar cliente"
      description={customer.user?.email ?? undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-edit" loading={updateAccount.isPending} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="customer-edit" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
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
          error={errors.phone_number?.message}
          {...register('phone_number')}
        />
        <fieldset className="grid gap-4 rounded-xl border border-outline p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium text-ink">Contraseña nueva (opcional)</legend>
          <Input
            label="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Repetir contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </fieldset>
      </form>
    </Modal>
  );
};
