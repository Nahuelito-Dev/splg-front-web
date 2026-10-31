import type {
  AdminInvitation,
  RepurchaseCustomerForecast,
  RepurchaseCustomerRef,
  RepurchaseForecastRow,
  RepurchaseRun,
} from '../../../services/api/types';
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
