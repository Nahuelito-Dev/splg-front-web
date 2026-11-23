import type { CashCollectionSettings, PendingCollections, SettlePending } from '../../services/api/types';
import { formatCurrency, formatDay } from '../../utils/format';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** La caja del formulario ('' = sin caja) a partir de lo guardado. */
export const boxesOf = (settings: CashCollectionSettings) => ({
  mercadoPago: settings.mercadoPagoCashBoxId ?? '',
});

/** El cuerpo del PATCH: `null` quita la caja. */
export const toSettingsBody = (values: { mercadoPago: string }) => ({
  mercadoPagoCashBoxId: values.mercadoPago || null,
});

/** «Hay N cobros sin asentar desde …», o que no hay ninguno. */
export const pendingSentence = (pending: PendingCollections, from: string): string => {
  if (pending.count === 0) return `No hay cobros sin asentar desde el ${formatDay(from)}.`;
  const parts: string[] = [];
  if (pending.mercadoPago.count > 0) parts.push(`${pending.mercadoPago.count} de Mercado Pago`);
  if (pending.refunds.count > 0) {
    parts.push(plural(pending.refunds.count, 'devolución sin su egreso', 'devoluciones sin su egreso'));
  }
  return `Hay ${plural(pending.count, 'movimiento', 'movimientos')} de ventas sin asentar desde el ${formatDay(from)} (${formatCurrency(pending.amount)} netos): ${parts.join(', ')}.`;
};

/** Qué pasó al asentar: lo asentado, y lo que quedó sin asentar con su motivo. */
export const settleSummary = (result: SettlePending): { text: string; complete: boolean } => {
  const parts = [plural(result.settled, 'cobro asentado', 'cobros asentados')];
  if (result.refundsSettled > 0) {
    parts.push(plural(result.refundsSettled, 'devolución asentada', 'devoluciones asentadas'));
  }
  if (result.feesSettled > 0) {
    parts.push(plural(result.feesSettled, 'comisión asentada', 'comisiones asentadas'));
  }
  if (result.alreadySettled > 0) parts.push(`${result.alreadySettled} ya estaban asentados`);
  if (result.withoutCashBox > 0) {
    parts.push(`${plural(result.withoutCashBox, 'cobro', 'cobros')} sin caja configurada`);
  }
  if (result.failed > 0) {
    parts.push(
      `${plural(result.failed, 'cobro', 'cobros')} que la caja rechazó (revisá que esté activa y con la sesión abierta)`,
    );
  }
  return { text: parts.join('; '), complete: result.withoutCashBox === 0 && result.failed === 0 };
};

/** ¿Se puede asentar? Hace falta la caja del medio de lo pendiente; las devoluciones salen de la caja donde entró el cobro. */
export const canSettle = (settings: CashCollectionSettings, pending: PendingCollections): boolean =>
  (pending.mercadoPago.count > 0 && settings.mercadoPagoCashBoxId !== null) || pending.refunds.count > 0;
