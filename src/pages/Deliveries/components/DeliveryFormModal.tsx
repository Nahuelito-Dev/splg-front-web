import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { accountFields, newPassword } from '../../../common/forms/accountSchema';
import { Button, Checkbox, Input, Modal, Select } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { usePermissions } from '../../../hooks';
import {
  useCreateDelivery,
  useDistributorOptions,
  useUpdateDeliveryAccount,
  useSetDeliveryEnabled,
  useUpdateDeliveryStatus,
} from '../../../services/queries/deliveries';
import { notify } from '../../../utils/notifications';

/** Edición: la cuenta (nombre, teléfono, contraseña opcional) y lo operativo. */
const editSchema = z
  .object({
    ...accountFields,
    password: z.union([z.literal(''), newPassword]),
    confirmPassword: z.string(),
    validated: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type EditValues = z.infer<typeof editSchema>;

/** Alta: cuenta completa con confirmación de contraseña, más la distribuidora (sólo la usa el administrador general). */
const createSchema = z
  .object({
    ...accountFields,
    email: z.string().trim().email('Email inválido'),
    password: newPassword,
    confirmPassword: z.string(),
    distributorId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type CreateValues = z.infer<typeof createSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con chofer es edición; sin chofer, alta. */
  delivery: Delivery | null;
}

export const DeliveryFormModal = ({ open, onClose, delivery }: Props) =>
  delivery ? (
    <EditDeliveryForm open={open} onClose={onClose} delivery={delivery} />
  ) : (
    <CreateDeliveryForm open={open} onClose={onClose} />
  );

const CreateDeliveryForm = ({ open, onClose }: Omit<Props, 'delivery'>) => {
  const { isSuperAdmin } = usePermissions();
  const createDelivery = useCreateDelivery();
  const { data: distributors } = useDistributorOptions(open && isSuperAdmin);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (open)
      reset({ full_name: '', phone_number: '', email: '', password: '', confirmPassword: '', distributorId: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(({ confirmPassword: _, distributorId, ...account }) =>
    createDelivery.mutate(
      { ...account, distributorId: distributorId || undefined, validated: false, isActive: true },
      {
        onSuccess: () => {
          notify.success('Chofer creado');
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
      title="Nuevo chofer"
      description="Se crea la cuenta con la que el chofer entra a la app. Queda pendiente de validar."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="delivery-create" loading={createDelivery.isPending}>
            Crear chofer
          </Button>
        </>
      }
    >
      <form id="delivery-create" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
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
        {isSuperAdmin && (
          <div className="sm:col-span-2">
            <Select
              label="Empresa (distribuidora)"
              hint="Sin elegir, la API usa la que estés viendo (“Ver como”)."
              options={[
                { value: '', label: '— Usar la empresa activa —' },
                ...(distributors ?? []).map((d) => ({ value: d.distributor_id, label: d.name })),
              ]}
              {...register('distributorId')}
            />
          </div>
        )}
      </form>
    </Modal>
  );
};

const EditDeliveryForm = ({ open, onClose, delivery }: Omit<Props, 'delivery'> & { delivery: Delivery }) => {
  const updateAccount = useUpdateDeliveryAccount();
  const updateStatus = useUpdateDeliveryStatus();
  const setEnabled = useSetDeliveryEnabled();
  const saving = updateAccount.isPending || updateStatus.isPending || setEnabled.isPending;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (open) {
      reset({
        full_name: delivery.user?.full_name ?? '',
        phone_number: delivery.user?.phone_number ?? '',
        password: '',
        confirmPassword: '',
        validated: delivery.validated,
        isActive: delivery.isEnabled,
      });
    }
  }, [open, delivery, reset]);

  const onSubmit = handleSubmit(async ({ full_name, phone_number, password, validated, isActive }) => {
    const tasks: Promise<unknown>[] = [];
    if (dirtyFields.full_name || dirtyFields.phone_number || dirtyFields.password) {
      tasks.push(
        updateAccount.mutateAsync({
          userId: delivery.user_id,
          changes: { full_name, phone_number, ...(password && { password }) },
        }),
      );
    }
    if (dirtyFields.validated) {
      tasks.push(updateStatus.mutateAsync({ id: delivery.delivery_id, changes: { validated } }));
    }
    // La habilitación va por su propio endpoint: al deshabilitar, la API también lo desconecta.
    if (dirtyFields.isActive) {
      tasks.push(setEnabled.mutateAsync({ id: delivery.delivery_id, isEnabled: isActive }));
    }
    try {
      await Promise.all(tasks);
      notify.success('Chofer actualizado');
      onClose();
    } catch (error) {
      notify.error(error);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar chofer"
      description={delivery.user?.email ?? undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="delivery-edit" loading={saving} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="delivery-edit" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
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

        <fieldset className="grid gap-3 rounded-xl border border-outline p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium text-ink">Estado operativo</legend>
          <Checkbox label="Validado por la distribuidora" {...register('validated')} />
          <Checkbox label="Habilitado por la distribuidora" {...register('isActive')} />
        </fieldset>

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
