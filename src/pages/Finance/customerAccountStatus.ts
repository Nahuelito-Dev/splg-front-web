export type AccountStatus = 'active' | 'blocked' | 'closed';

/** Máquina de estados del back: active ↔ blocked, active|blocked → closed, closed → active (nunca closed → blocked). */
const TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  active: ['blocked', 'closed'],
  blocked: ['active', 'closed'],
  closed: ['active'],
};

const LABELS: Record<AccountStatus, string> = {
  active: 'Activa',
  blocked: 'Bloqueada (no se le vende a cuenta)',
  closed: 'Cerrada (exige saldo cero)',
};

export const canChangeAccountStatus = (from: AccountStatus, to: AccountStatus): boolean =>
  from === to || TRANSITIONS[from].includes(to);

/** Las opciones del selector de estado: el actual y a los que puede pasar. */
export const accountStatusOptions = (from: AccountStatus): { value: AccountStatus; label: string }[] =>
  (['active', 'blocked', 'closed'] as const)
    .filter((status) => canChangeAccountStatus(from, status))
    .map((status) => ({ value: status, label: LABELS[status] }));

export const accountStatusError = (from: AccountStatus, to: AccountStatus): string | undefined =>
  canChangeAccountStatus(from, to)
    ? undefined
    : 'Una cuenta cerrada sólo puede volver a activa: reabrila primero y después bloqueala';
