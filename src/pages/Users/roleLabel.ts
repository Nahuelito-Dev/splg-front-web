import type { Label } from '../../utils/statusLabels';

/** El rol de un usuario (`role.type`) no es un estado de un recurso: vive acá, no en utils/statusLabels. */
const ROLE_LABEL: Record<string, Label> = {
  customer: { text: 'Cliente', tone: 'accent' },
  delivery: { text: 'Chofer', tone: 'info' },
  admin: { text: 'Admin', tone: 'primary' },
  super_admin: { text: 'Administrador general', tone: 'success' },
};

export const roleLabel = (type: string | null | undefined): Label =>
  type && type in ROLE_LABEL ? ROLE_LABEL[type] : { text: type ?? '—', tone: 'neutral' };
