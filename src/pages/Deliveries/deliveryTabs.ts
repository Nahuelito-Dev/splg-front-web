import type { DeliveriesStatusTab } from '../../services/queries/deliveries';

export const DELIVERY_TAB_LABELS: Record<DeliveriesStatusTab, string> = {
  all: 'Todos',
  unvalidated: 'Por validar',
  enabled: 'Habilitados',
  disabled: 'Deshabilitados',
  online: 'En línea',
};

/** Los grupos de la lista de choferes, en el orden de las pestañas. */
export const DELIVERY_TAB_ORDER: DeliveriesStatusTab[] = ['all', 'unvalidated', 'enabled', 'disabled', 'online'];

export const isDeliveriesStatusTab = (value: string): value is DeliveriesStatusTab =>
  (DELIVERY_TAB_ORDER as string[]).includes(value);
