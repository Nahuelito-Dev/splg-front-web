import type { UserAddress } from '../../services/api/types';
import type { Label } from '../../utils/statusLabels';

/** Qué tan bien ubicó el mapa la dirección (`geocodePrecision`). */
export const ADDRESS_PRECISION: Record<UserAddress['geocodePrecision'], Label> = {
  exact: { text: 'Exacta', tone: 'success' },
  approximate: { text: 'Aproximada', tone: 'warn' },
  unresolved: { text: 'Sin resolver', tone: 'danger' },
};
