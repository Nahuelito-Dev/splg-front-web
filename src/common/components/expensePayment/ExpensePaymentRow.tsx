import type { ReactNode } from 'react';
import { Badge, Button } from '../ui';
import { formatCurrency, formatDateTime } from '../../../utils/format';

interface Props {
  /** Qué se paga: «Pago del servicio», «Compra del neumático»… */
  title: string;
  paid: boolean;
  paidAt?: string | null;
  amount?: number | null;
  /** Texto del botón; sin él no se ofrece pagar (p. ej. el gasto no se puede pagar desde una caja). */
  actionLabel?: string;
  onAction?: () => void;
  /** Por qué no se puede accionar (permisos de sólo lectura, etc.). */
  blockedReason?: string;
  /** Aclaración cuando no hay acción: «La pagó el chofer: se salda en su rendición». */
  note?: ReactNode;
  paidLabel?: string;
  unpaidLabel?: string;
}

/** Una línea «Pago / Sin pagar» con su fecha, su importe y el botón para registrar el pago. */
export const ExpensePaymentRow = ({
  title,
  paid,
  paidAt,
  amount,
  actionLabel,
  onAction,
  blockedReason,
  note,
  paidLabel = 'Pago',
  unpaidLabel = 'Sin pagar',
}: Props) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline px-3 py-2">
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-medium text-ink">{title}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <Badge label={paid ? { text: paidLabel, tone: 'success' } : { text: unpaidLabel, tone: 'warn' }} />
        {paid && paidAt && <span>{formatDateTime(paidAt)}</span>}
        {paid && amount != null && <span className="font-mono">{formatCurrency(amount)}</span>}
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
    </div>
    {!paid && actionLabel && onAction && (
      <Button size="sm" onClick={onAction} blockedReason={blockedReason}>
        {actionLabel}
      </Button>
    )}
  </div>
);
