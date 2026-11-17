import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormSelect } from '../../../common/components/ui';
import { useAppSelector } from '../../../hooks';
import { useMyPermissions } from '../../../services/queries/permissions';
import { useStaffRoles } from '../../../services/queries/staffRoles';
import { NOT_HELD_ROLE_HINT, canGrant } from '../staffRoleRules';

interface Props {
  /** El formulario está abierto: recién ahí se piden los roles. */
  open: boolean;
}

/**
 * «Rol del personal» del administrador nuevo, con las reglas de «Cambiar rol»: se ven todos los roles, pero los que
 * tienen permisos que la sesión no tiene (y el de sistema, si no los tiene todos) quedan apagados. Con todos los
 * permisos arranca en el de sistema, como lo da de alta la API sin `staffRoleId`; si no, hay que elegirlo.
 */
export const NewAdminStaffRoleField = ({ open }: Props) => {
  const roles = useStaffRoles(open);
  const email = useAppSelector((state) => state.auth.email);
  const mine = useMyPermissions(email).data;
  const { getValues, setValue } = useFormContext<{ staffRoleId?: string }>();
  const systemRoleId = roles.data?.find((role) => role.isSystem)?.staffRoleId;

  useEffect(() => {
    if (open && mine?.allPermissions && systemRoleId && !getValues('staffRoleId'))
      setValue('staffRoleId', systemRoleId);
  }, [open, mine?.allPermissions, systemRoleId, getValues, setValue]);

  return (
    <FormSelect
      name="staffRoleId"
      label="Rol del personal"
      required
      hint={
        roles.isError
          ? 'No se pudieron cargar los roles: cerrá y volvé a abrir'
          : 'Qué puede hacer en el panel. Sólo podés dar roles cuyos permisos tenés.'
      }
      options={[
        { value: '', label: roles.isLoading ? 'Cargando roles…' : 'Elegí un rol' },
        ...(roles.data ?? []).map((role) => {
          const grantable = canGrant(role, mine);
          return {
            value: role.staffRoleId,
            label: grantable ? role.name : `${role.name} (${NOT_HELD_ROLE_HINT})`,
            disabled: !grantable,
          };
        }),
      ]}
    />
  );
};
