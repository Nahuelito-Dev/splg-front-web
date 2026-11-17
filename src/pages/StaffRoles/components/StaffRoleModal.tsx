import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorState, Form, FormInput, FormTextArea, LoadingState, Modal } from '../../../common/components/ui';
import type { StaffRole } from '../../../services/api/types';
import { allows, useAppSelector } from '../../../hooks';
import { useMyPermissions, usePermissionCatalog } from '../../../services/queries/permissions';
import { useCreateStaffRole, useUpdateStaffRole } from '../../../services/queries/staffRoles';
import { toApiError } from '../../../services/api/errors';
import { notify } from '../../../utils/notifications';
import { PermissionModulePicker } from './PermissionModulePicker';
import { togglePermissions, type PermissionRules } from './permissionSelection';

const schema = z.object({
  name: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(60, 'Hasta 60 caracteres'),
  description: z.string().trim().max(300, 'Hasta 300 caracteres').optional(),
  permissions: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

interface Props {
  role: StaffRole | null;
  open: boolean;
  onClose: () => void;
}

const PERMISSION_CODES = new Set(['STAFF_ROLE_TARGET_OUTRANKS', 'STAFF_ROLE_PERMISSION_NOT_HELD']);

const sameKeys = (a: string[], b: string[]) => a.length === b.length && a.every((key) => b.includes(key));

export const StaffRoleModal = ({ role, open, onClose }: Props) => {
  // El catálogo se pide recién al abrir el formulario.
  const catalog = usePermissionCatalog(open);
  const email = useAppSelector((state) => state.auth.email);
  const myPermissions = useMyPermissions(email);
  const createRole = useCreateStaffRole();
  const updateRole = useUpdateStaffRole();
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', permissions: [] },
  });
  const permissions = methods.watch('permissions');

  useEffect(() => {
    if (open)
      methods.reset({
        name: role?.name ?? '',
        description: role?.description ?? '',
        permissions: role?.permissions ?? [],
      });
  }, [open, role, methods]);

  const rules = useMemo<PermissionRules>(() => {
    const impliedBy = new Map<string, string>();
    for (const permission of (catalog.data ?? []).flatMap((module) => module.permissions)) {
      if (!permissions.includes(permission.key)) continue;
      for (const implied of permission.implies) impliedBy.set(implied, permission.label);
    }
    const mine = myPermissions.data;
    return { impliedBy, held: (key) => !mine || allows(mine, key) };
  }, [catalog.data, permissions, myPermissions.data]);

  const togglePermission = (keys: string[], checked: boolean, single: boolean) => {
    const next = togglePermissions(permissions, keys, checked, catalog.data ?? [], single ? rules.held : undefined);
    methods.setValue('permissions', next, { shouldDirty: true });
    methods.clearErrors('permissions');
  };
  const labelOf = (key: string) =>
    (catalog.data ?? []).flatMap((module) => module.permissions).find((permission) => permission.key === key)?.label ??
    key;
  const onSubmit = (values: Values) => {
    // Los permisos van sólo si cambiaron: la API los controla enteros contra los de quien edita, y un rol con alguno
    // que el actor no tiene igual se puede renombrar.
    const permissionsChanged = !role || !sameKeys(values.permissions, role.permissions);
    if (permissionsChanged) {
      const notHeld = values.permissions.filter((key) => !rules.held(key));
      if (notHeld.length > 0) {
        methods.setError('permissions', {
          message: `Tiene permisos que vos no tenés (${notHeld.map(labelOf).join(', ')}): sacalos o dejá los permisos como estaban`,
        });
        return;
      }
    }
    const base = { name: values.name.trim(), description: values.description?.trim() || null };
    const options = {
      onSuccess: () => {
        notify.success(role ? 'Rol actualizado' : 'Rol creado');
        onClose();
      },
      // Lo que la API rechaza por los permisos (sacarle a un rol con administradores lo que vos no tenés, dar lo que no
      // tenés) va junto a los permisos, con su mensaje.
      onError: (error: unknown) => {
        const apiError = toApiError(error);
        if (apiError.code && PERMISSION_CODES.has(apiError.code))
          methods.setError('permissions', { message: apiError.messages.join('. ') });
        else notify.error(error);
      },
    };
    if (role) {
      const body = permissionsChanged ? { ...base, permissions: values.permissions } : base;
      updateRole.mutate({ id: role.staffRoleId, body }, options);
    } else createRole.mutate({ ...base, permissions: values.permissions }, options);
  };
  const permissionsError = methods.formState.errors.permissions?.message;
  const pending = createRole.isPending || updateRole.isPending;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? 'Editar rol' : 'Nuevo rol'}
      size="lg"
      closeBlocked={pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="staff-role-form" loading={pending}>
            Guardar
          </Button>
        </>
      }
    >
      {catalog.isLoading ? (
        <LoadingState />
      ) : catalog.isError ? (
        <ErrorState error={catalog.error} resource="El catálogo de permisos" onRetry={() => void catalog.refetch()} />
      ) : (
        <Form methods={methods} id="staff-role-form" onSubmit={onSubmit} className="space-y-5">
          <FormInput name="name" label="Nombre" required autoFocus />
          <FormTextArea name="description" label="Descripción" hint="Opcional" />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Permisos</h3>
            {permissionsError && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {permissionsError}
              </p>
            )}
            {catalog.data?.map((module) => (
              <PermissionModulePicker
                key={module.key}
                module={module}
                values={permissions}
                rules={rules}
                onToggle={togglePermission}
              />
            ))}
          </div>
        </Form>
      )}
    </Modal>
  );
};
