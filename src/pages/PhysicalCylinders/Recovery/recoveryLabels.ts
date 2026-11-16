import type { RecoveryCase, RecoveryManualReview, RecoveryNotice } from '../../../services/api/types';
import type { RecoveryDecision } from '../../../services/api/recovery';
import { formatCurrencyExact, formatDate } from '../../../utils/format';
import type { Label } from '../../../utils/statusLabels';

type Map<K extends string> = Record<K, Label>;

/** Cómo va la gestión de un envase que no volvió (CU-108). */
export const RECOVERY_CASE_STATUS: Map<RecoveryCase['status']> = {
  open: { text: 'En aviso', tone: 'info' },
  escalated: { text: 'Espera tu decisión', tone: 'danger' },
  lost: { text: 'Envase perdido', tone: 'warn' },
  returned: { text: 'Devuelto', tone: 'success' },
  deposit_charged: { text: 'Depósito a cobrar', tone: 'accent' },
  written_off: { text: 'Dado de baja', tone: 'neutral' },
  closed_no_charge: { text: 'Cerrado sin cargo', tone: 'neutral' },
};

/** Los escalones de la secuencia: cada uno con su aviso. */
export const RECOVERY_STEP: Record<number, string> = {
  1: 'Recordatorio',
  2: 'Aviso del depósito',
  3: 'Agotado',
};

export const recoveryStepText = (step: number): string => RECOVERY_STEP[step] ?? `Escalón ${step}`;

export const NOTICE_KIND: Record<RecoveryNotice['kind'], string> = {
  reminder: 'Recordatorio de devolución',
  deposit_warning: 'Aviso del depósito comprometido',
  pickup_offer: 'Oferta de retiro en la próxima entrega',
};

/** Qué pasó con la oferta de retiro en la entrega. */
export const OFFER_STATUS: Map<NonNullable<RecoveryNotice['status']>> = {
  pending: { text: 'Esperando respuesta', tone: 'info' },
  accepted: { text: 'Aceptada: lo retira el chofer', tone: 'success' },
  rejected: { text: 'Rechazada', tone: 'danger' },
  expired: { text: 'Vencida', tone: 'warn' },
};

export const MANUAL_REVIEW_REASON: Record<RecoveryManualReview['reason'], string> = {
  sin_cliente: 'No se sabe en poder de quién está',
  sin_entrega_registrada: 'No hay un movimiento de entrega registrado',
};

/** Los casos que esperan la decisión del administrador. */
export const isPendingDecision = (status: RecoveryCase['status']): boolean =>
  status === 'escalated' || status === 'lost';

/** Las tres decisiones del administrador, con lo que significa cada una. */
export const DECISIONS: ReadonlyArray<{ value: RecoveryDecision; label: string; help: string }> = [
  {
    value: 'charge_deposit',
    label: 'Cobrar el depósito',
    help: 'Queda registrado el importe a cobrar. El sistema no cobra: se cobra aparte, en el próximo pedido o en efectivo.',
  },
  {
    value: 'write_off',
    label: 'Dar el envase de baja',
    help: 'El envase se da por perdido y sale del inventario. Queda en su historial.',
  },
  {
    value: 'close_no_charge',
    label: 'Cerrar sin cargo',
    help: 'Se cierra el caso sin cobrarle al cliente. El envase sigue a su nombre.',
  },
];

export const DECISION_LABEL: Record<RecoveryDecision, string> = Object.fromEntries(
  DECISIONS.map((d) => [d.value, d.label]),
) as Record<RecoveryDecision, string>;

/** Lo que sigue en un caso, en una línea para la tabla. */
export const nextStepText = (c: RecoveryCase): string => {
  switch (c.status) {
    case 'open':
      return c.pickup?.status === 'accepted'
        ? 'Espera el retiro del chofer en la entrega'
        : `Pasa al próximo escalón el ${formatDate(c.stepDueAt)}`;
    case 'escalated':
    case 'lost':
      return `${formatCurrencyExact(c.depositAmount)} en juego`;
    case 'returned':
      return c.closedAt ? `Devuelto el ${formatDate(c.closedAt)}` : 'Devuelto';
    default:
      return c.closedAt ? `Cerrado el ${formatDate(c.closedAt)}` : 'Cerrado';
  }
};
