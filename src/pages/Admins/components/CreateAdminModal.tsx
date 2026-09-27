import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { accountFields, newPassword } from '../../../common/forms/accountSchema';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import type { AdminRole } from '../../../services/api/admins';
import { useCreateAdmin } from '../../../services/queries/admins';
import { useDistributors } from '../../../services/queries/distributors';
import { notify } from '../../../utils/notifications';

const ROLE_OPTIONS: Record<AdminRole, string> = {
  admin: 'Admin de empresa',
  super_admin: 'Administrador general',
};

const baseSchema = z.object({
  ...accountFields,
  email: z.string().trim().email('Email inválido'),
  password: newPassword,
  confirmPassword: z.string(),
  role: z.enum(['admin', 'super_admin']),
  distributorId: z.string().optional(),
});

type AdminFormValues = z.infer<typeof baseSchema>;

/**
 * Mismas reglas que la API: un `admin` pertenece siempre a una distribuidora
 * (el administrador general la elige; el admin de empresa crea en la suya) y un
 * `super_admin` es de la plataforma, sin distribuidora.
 */
const adminSchema = (isSuperAdmin: boolean) =>
  baseSchema.superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Las contraseñas no coinciden', path: ['confirmPassword'] });
    }
    if (isSuperAdmin && data.role === 'admin' && !data.distributorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Elegí la distribuidora del admin',
        path: ['distributorId'],
      });
    }
  });

interface Props {
  open: boolean;
  onClose: () => void;
  /** El administrador general puede elegir rol y empresa; el admin de empresa sólo crea admins en la suya. */
  isSuperAdmin: boolean;
}

export const CreateAdminModal = ({ open, onClose, isSuperAdmin }: Props) => {
  const createAdmin = useCreateAdmin();
  const { data: distributors } = useDistributors();
  const availableRoles = useMemo<AdminRole[]>(
    () => (isSuperAdmin ? ['admin', 'super_admin'] : ['admin']),
    [isSuperAdmin],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema(isSuperAdmin)),
    defaultValues: { role: 'admin' },
  });

  const role = watch('role');

  useEffect(() => {
    if (open)
      reset({
        full_name: '',
        phone_number: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
        distributorId: '',
      });
  }, [open, reset]);

  const onSubmit = handleSubmit(({ confirmPassword: _confirmPassword, role, distributorId, ...account }) =>
    createAdmin.mutate(
      { role, account: { ...account, distributorId: role === 'admin' && distributorId ? distributorId : undefined } },
      {
        onSuccess: () => {
          notify.success('Admin creado');
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
      title="Nuevo admin"
      description="Se crea la cuenta con la que entra al panel."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="admin-create" loading={createAdmin.isPending}>
            Crear admin
          </Button>
        </>
      }
    >
      <form id="admin-create" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
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
        <Select
          label="Rol"
          required
          options={availableRoles.map((role) => ({ value: role, label: ROLE_OPTIONS[role] }))}
          error={errors.role?.message}
          {...register('role')}
        />
        {role === 'super_admin' ? (
          <p className="self-end text-xs text-muted">
            El administrador general es de la plataforma: no lleva distribuidora.
          </p>
        ) : isSuperAdmin ? (
          <Select
            label="Distribuidora"
            required
            error={errors.distributorId?.message}
            options={[
              { value: '', label: 'Elegí una distribuidora' },
              ...(distributors ?? []).map((d) => ({ value: d.distributor_id, label: d.name })),
            ]}
            {...register('distributorId')}
          />
        ) : (
          <p className="self-end text-xs text-muted">El admin se crea en tu misma distribuidora.</p>
        )}
      </form>
    </Modal>
  );
};
