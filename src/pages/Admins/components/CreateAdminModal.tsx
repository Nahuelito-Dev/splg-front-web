import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { accountFields, newPassword } from '../../../common/forms/accountSchema';
import { checkAccountFree } from '../../../common/forms/checkAccountFree';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import type { AdminRole } from '../../../services/api/admins';
import { useCreateAdmin } from '../../../services/queries/admins';
import { useDistributors } from '../../../services/queries/distributors';
import { toApiError } from '../../../services/api/errors';
import { notify } from '../../../utils/notifications';
import { NewAdminStaffRoleField } from './NewAdminStaffRoleField';

/** Los rechazos de la API que son del rol del personal elegido: van junto al campo. */
const STAFF_ROLE_CODES = new Set(['STAFF_ROLE_REQUIRED', 'STAFF_ROLE_PERMISSION_NOT_HELD']);

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
  staffRoleId: z.string().optional(),
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
    // El admin de empresa da de alta con un rol del personal (la API pide uno que pueda dar).
    if (!isSuperAdmin && !data.staffRoleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Elegí el rol del personal del administrador nuevo',
        path: ['staffRoleId'],
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
  const { data: distributors } = useDistributors(open && isSuperAdmin);
  const availableRoles = useMemo<AdminRole[]>(
    () => (isSuperAdmin ? ['admin', 'super_admin'] : ['admin']),
    [isSuperAdmin],
  );

  const methods = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema(isSuperAdmin)),
    defaultValues: { role: 'admin' },
  });
  const {
    reset,
    watch,
    setError,
    formState: { isSubmitting },
  } = methods;

  const role = watch('role');

  // El modal puede cerrarse mientras corre check-exists: en ese caso no se da de alta nada.
  const openRef = useRef(open);
  openRef.current = open;

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
        staffRoleId: '',
      });
  }, [open, reset]);

  const onSubmit = async ({
    confirmPassword: _confirmPassword,
    role,
    distributorId,
    staffRoleId,
    ...account
  }: AdminFormValues) => {
    if (!(await checkAccountFree(account, setError)) || !openRef.current) return;
    createAdmin.mutate(
      {
        role,
        account: {
          ...account,
          distributorId: role === 'admin' && distributorId ? distributorId : undefined,
          staffRoleId: !isSuperAdmin && staffRoleId ? staffRoleId : undefined,
        },
      },
      {
        onSuccess: () => {
          notify.success('Admin creado');
          onClose();
        },
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.code && STAFF_ROLE_CODES.has(apiError.code))
            setError('staffRoleId', { message: apiError.messages.join('. ') });
          else notify.error(error);
        },
      },
    );
  };

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
          <Button type="submit" form="admin-create" loading={isSubmitting || createAdmin.isPending}>
            Crear admin
          </Button>
        </>
      }
    >
      <Form methods={methods} id="admin-create" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormInput name="full_name" label="Nombre completo" required autoComplete="name" />
        <FormInput name="phone_number" label="Teléfono" required type="tel" placeholder="+5493764000000" />
        <div className="sm:col-span-2">
          <FormInput name="email" label="Email" required type="email" autoComplete="email" />
        </div>
        <FormInput name="password" label="Contraseña" required type="password" autoComplete="new-password" />
        <FormInput
          name="confirmPassword"
          label="Repetir contraseña"
          required
          type="password"
          autoComplete="new-password"
        />
        <FormSelect
          name="role"
          label="Rol"
          required
          options={availableRoles.map((role) => ({ value: role, label: ROLE_OPTIONS[role] }))}
        />
        {role === 'super_admin' ? (
          <p className="self-end text-xs text-muted">
            El administrador general es de la plataforma: no lleva distribuidora.
          </p>
        ) : isSuperAdmin ? (
          <FormSelect
            name="distributorId"
            label="Distribuidora"
            required
            options={[
              { value: '', label: 'Elegí una distribuidora' },
              ...(distributors ?? []).map((d) => ({ value: d.distributor_id, label: d.name })),
            ]}
          />
        ) : (
          <p className="self-end text-xs text-muted">El admin se crea en tu misma distribuidora.</p>
        )}
        {!isSuperAdmin && (
          <div className="sm:col-span-2">
            <NewAdminStaffRoleField open={open} />
          </div>
        )}
      </Form>
    </Modal>
  );
};
