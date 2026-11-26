import type {
  AdminInvitation,
  RepurchaseCustomerForecast,
  RepurchaseCustomerRef,
  RepurchaseForecastRow,
  RepurchaseRun,
} from '../../../services/api/types';
import { argentinaDay, formatDate } from '../../../utils/format';
import type { Label } from '../../../utils/statusLabels';

/** Las ventanas de días que se pueden mirar hacia adelante en «Próximas recompras». */
export const FORECAST_WINDOWS = [7, 14, 30, 60] as const;
export const DEFAULT_FORECAST_WINDOW = 14;

/** Cómo terminó (o va) cada invitación de recompra. */
export const INVITATION_STATUS: Record<AdminInvitation['status'], Label> = {
  pending: { text: 'Abierta', tone: 'info' },
  accepted: { text: 'Aceptada', tone: 'success' },
  rejected: { text: 'Descartada', tone: 'neutral' },
  expired: { text: 'Vencida', tone: 'warn' },
  cancelled: { text: 'Compró por su cuenta', tone: 'neutral' },
};

/** Con qué se estimó la fecha. */
export const ESTIMATE_SOURCE: Record<RepurchaseForecastRow['source'], string> = {
  history: 'Sus compras',
  declared: 'Consumo declarado',
};

/** Por qué no se puede proyectar a un cliente. */
export const NO_FORECAST_REASON: Record<NonNullable<RepurchaseCustomerForecast['reason']>, string> = {
  no_purchases: 'Todavía no recibió ninguna compra de esta distribuidora.',
  insufficient_history: 'Tiene pocas compras y no declaró cuánto consume: no hay con qué estimar.',
  irregular_history: 'Sus compras son demasiado irregulares para proyectarlas y no declaró su consumo.',
  stale: 'Hace tiempo que no compra: se dejó de proyectar.',
};

/** Por qué no se invitó a los clientes que se evaluaron, en lenguaje del administrador. */
export const SKIP_REASON: Record<string, string> = {
  notice_disabled: 'Desactivaron el aviso',
  not_yet: 'Todavía no les toca',
  recent_order: 'Tienen un pedido en curso o reciente',
  cooldown: 'Se les invitó hace poco',
  same_cycle: 'Ya se los invitó en este ciclo de consumo',
  no_stock: 'Sin stock de lo que piden',
  no_address: 'Sin dirección de entrega vigente',
};

/** La ficha del cliente, con la pestaña de recompra abierta; sin perfil de cliente no hay a dónde ir. */
export const customerHref = (customer: RepurchaseCustomerRef): string | null =>
  customer.customerId ? `/customers/details/${customer.customerId}?tab=repurchase` : null;

/** «Se le acaba hoy» / «En 3 días» / «Hace 4 días»: los días con decimales del back, redondeados. */
export const daysLeftText = (daysLeft: number): string => {
  const days = Math.round(Math.abs(daysLeft));
  if (days === 0) return 'Hoy';
  const unit = days === 1 ? 'día' : 'días';
  return daysLeft < 0 ? `Hace ${days} ${unit}` : `En ${days} ${unit}`;
};

/** La tasa de conversión como porcentaje; sin invitaciones resueltas todavía, «—». */
export const conversionText = (rate: number | null): string => (rate === null ? '—' : `${Math.round(rate * 100)} %`);

/** Resumen de una corrida: cuántos se invitan y por qué no el resto. */
export const runSummary = (run: Pick<RepurchaseRun, 'invited' | 'expired' | 'skipped'>): string => {
  const skipped = Object.entries(run.skipped)
    .filter(([, n]) => n > 0)
    .map(([reason, n]) => `${n} ${(SKIP_REASON[reason] ?? reason).toLowerCase()}`);
  return [
    `${run.invited} invitación(es)`,
    run.expired > 0 ? `${run.expired} vencida(s)` : null,
    skipped.length > 0 ? `sin invitar: ${skipped.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
};

/** El ajuste del cliente sobre su fecha: «+3 días respecto del promedio». Sin ajuste, nada que decir. */
export const offsetText = (offsetDays: number): string | null => {
  if (offsetDays === 0) return null;
  const days = Math.abs(offsetDays);
  return `${offsetDays > 0 ? '+' : '−'}${days} ${days === 1 ? 'día' : 'días'} respecto del promedio`;
};

/** Ayuda corta de las dos columnas nuevas, para quien se pregunta de dónde sale cada cosa. */
export const OFFSET_HELP =
  'El ajuste corre la fecha de cada cliente según cuánto le acertó la estimación en sus invitaciones anteriores (hasta 15 días para cada lado). Sólo rige con consumo declarado o poca historia: con más compras, el ritmo propio ya corrige.';
export const NOTICE_HELP =
  'El aviso sale en el horario de la franja que el cliente suele elegir; sin franja, cuando se abre la invitación.';

/** 18:00, siempre en 24 horas y en hora de Buenos Aires (no la del navegador). */
const clock24 = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Argentina/Buenos_Aires',
});

const dayAfter = (day: string): string => {
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

/** «hoy a las 18:00», «mañana a las 09:00» o «el 3 dic 2026 a las 18:00» (hora de Buenos Aires). */
export const whenText = (iso: string, now: Date = new Date()): string => {
  const day = argentinaDay(iso);
  const today = argentinaDay(now);
  const time = clock24.format(new Date(iso));
  if (day === today) return `hoy a las ${time}`;
  if (day === dayAfter(today)) return `mañana a las ${time}`;
  return `el ${formatDate(iso)} a las ${time}`;
};

/**
 * Qué pasa con el aviso de la invitación abierta: «Se avisa hoy a las 18:00» o «Avisado hoy a las 09:05».
 * Sin invitación abierta (o sin hora programada) no hay nada que decir.
 */
export const noticeScheduleText = (
  row: Pick<RepurchaseForecastRow, 'openInvitation' | 'notifyAt' | 'notifiedAt'>,
  now: Date = new Date(),
): string | null => {
  if (!row.openInvitation) return null;
  if (row.notifiedAt) return `Avisado ${whenText(row.notifiedAt, now)}`;
  return row.notifyAt ? `Se avisa ${whenText(row.notifyAt, now)}` : null;
};
