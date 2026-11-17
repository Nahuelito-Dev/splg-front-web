import { useCallback } from 'react';
import { useAppSelector, usePermiso, usePermissions } from '../../hooks';
import type { Admin } from '../../services/api/types';
import { useMyPermissions } from '../../services/queries/permissions';
import { useStaffRoles } from '../../services/queries/staffRoles';
import { targetOutranksReason } from './staffRoleRules';

/**
 * Si la sesión ofrece «Cambiar rol» del personal (la API pide `administradores.gestionar`) y, para cada administrador,
 * por qué no puede usarlo: modo soporte o un rol actual con permisos que la sesión no tiene. Lo comparten la tabla y la
 * ficha del administrador.
 */
export const useStaffRoleChange = () => {
  const { canWrite, readOnly, writeHint } = usePermissions();
  const manageAdmins = usePermiso('administradores.gestionar');
  const allowed = manageAdmins.allowed && (canWrite || readOnly);
  const email = useAppSelector((state) => state.auth.email);
  const mine = useMyPermissions(email).data;
  // Los permisos del rol actual de cada administrador: sólo hacen falta si se ofrece la acción.
  const roles = useStaffRoles(allowed).data;
  const blockedReasonFor = useCallback(
    (admin: Admin) => (readOnly ? writeHint : undefined) ?? targetOutranksReason(admin, roles, mine),
    [readOnly, writeHint, roles, mine],
  );
  return { allowed, blockedReasonFor };
};
