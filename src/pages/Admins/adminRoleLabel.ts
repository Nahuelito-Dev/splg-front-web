import type { Admin } from '../../services/api/types';
import type { Label } from '../../utils/statusLabels';
import { roleLabel } from '../Users/roleLabel';

/** El admin de una empresa se ve con su rol del personal (F37); el administrador general, con el suyo. */
export const adminRoleLabel = (admin: Admin): Label =>
  admin.staffRole
    ? { text: admin.staffRole.name, tone: 'primary' }
    : roleLabel(admin.user?.role?.type ?? admin.role?.type);
