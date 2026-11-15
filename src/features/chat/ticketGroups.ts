import type { TicketStatusGroup } from '../../services/api/supportChat';

/** El filtro de estado de los listados de tickets: se ven también los resueltos y cerrados (auditoría). */
export const GROUP_OPTIONS: { value: TicketStatusGroup; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'closed', label: 'Cerrados' },
];

export const isGroup = (value: string): value is TicketStatusGroup => GROUP_OPTIONS.some((o) => o.value === value);

export const groupLabel = (group: TicketStatusGroup): string =>
  GROUP_OPTIONS.find((o) => o.value === group)?.label ?? group;
