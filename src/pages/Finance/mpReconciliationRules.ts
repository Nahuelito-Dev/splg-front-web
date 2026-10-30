import { z } from 'zod';
import type {
  ApplyMpReconciliationBody,
  MpApply,
  MpDifferenceKind,
  MpReconciliationItem,
  MpSummary,
} from '../../services/api/types';
import { formatCurrencyExact } from '../../utils/format';
import { day } from './financeSchemas';

/** Hasta cuántos días puede abarcar una conciliación (lo mismo que exige la API). */
export const MAX_DAYS = 31;

const dayCount = (from: string, to: string): number =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000) + 1;

/** El rango de una conciliación nueva: días reales, `hasta` no anterior a `desde`, hasta 31 días y nada del futuro. */
export const newReconciliationSchema = (today: string) =>
  z
    .object({ from: day('Elegí desde cuándo'), to: day('Elegí hasta cuándo') })
    .refine((v) => v.from <= v.to, { path: ['to'], message: 'No puede ser anterior al inicio' })
    .refine((v) => v.to <= today, { path: ['to'], message: 'No puede ser una fecha futura' })
    .refine((v) => v.from > v.to || dayCount(v.from, v.to) <= MAX_DAYS, {
      path: ['to'],
      message: `El rango no puede pasar de ${MAX_DAYS} días`,
    });

export interface KindInfo {
  title: string;
  help: string;
}

/** Cada tipo de diferencia: cómo se titula su grupo y qué pasa al aplicarla. */
export const KIND_INFO: Record<MpDifferenceKind, KindInfo> = {
  payment_not_in_cash: {
    title: 'Cobros sin ingreso en la caja',
    help: 'Mercado Pago cobró y la caja no lo tiene. Al aplicar entra el cobro con su comisión.',
  },
  fee_pending: {
    title: 'Comisiones sin asentar',
    help: 'El cobro entró sin su comisión. Al aplicar sale la que informa el reporte.',
  },
  fee_mismatch: {
    title: 'Comisión distinta de la asentada',
    help: 'Al aplicar se asienta la diferencia: un egreso si Mercado Pago cobró más, un reintegro si cobró menos.',
  },
  tax_withholding: {
    title: 'Impuestos y retenciones de cobros',
    help: 'Mercado Pago retuvo impuestos de estos cobros. Al aplicar salen como «Impuestos y retenciones».',
  },
  refund_missing: {
    title: 'Devoluciones y contracargos sin egreso',
    help: 'Mercado Pago devolvió el dinero y la caja no lo descontó. Al aplicar sale como devolución a clientes.',
  },
  fee_reimbursement: {
    title: 'Comisiones reintegradas',
    help: 'Mercado Pago devolvió la comisión de un cobro devuelto. Al aplicar entra como «Reintegros de Mercado Pago».',
  },
  tax_refund: {
    title: 'Impuestos devueltos',
    help: 'Mercado Pago devolvió impuestos o retenciones de un cobro devuelto. Al aplicar entran como «Reintegros de Mercado Pago».',
  },
  payout: {
    title: 'Retiros de la billetera',
    help: 'Dinero que salió de Mercado Pago hacia un banco. Elegí la caja que lo recibió: se asienta como transferencia entre cajas.',
  },
  tax_row: {
    title: 'Impuestos y retenciones de la cuenta',
    help: 'Impuestos que Mercado Pago descontó de la cuenta y no son de un cobro. Al aplicar salen como «Impuestos y retenciones».',
  },
  amount_mismatch: {
    title: 'Importe distinto (sólo informativo)',
    help: 'La caja tiene otro importe que el bruto de Mercado Pago. Los movimientos no se editan: corregilo con un ajuste manual.',
  },
  ledger_without_mp: {
    title: 'Ingresos que el reporte no trae (sólo informativo)',
    help: 'La caja tiene el ingreso pero el reporte de estas fechas no: Mercado Pago lo libera otro día o falta.',
  },
  unknown_payment: {
    title: 'Cobros que no son de ninguna distribuidora',
    help: 'Cobros de la cuenta de Mercado Pago que no corresponden a ningún pago del sistema. No se asientan.',
  },
  other_movement: {
    title: 'Otros movimientos de la cuenta',
    help: 'Reservas, envíos, disputas y demás que el sistema no asienta solo: revisalos en Mercado Pago.',
  },
};

const KIND_ORDER = Object.keys(KIND_INFO) as MpDifferenceKind[];

export interface DifferenceGroup {
  kind: MpDifferenceKind;
  info: KindInfo;
  items: MpReconciliationItem[];
}

/** Las diferencias agrupadas por tipo, en el orden en que se explican; los grupos vacíos no salen. */
export const groupByKind = (items: MpReconciliationItem[]): DifferenceGroup[] =>
  KIND_ORDER.map((kind) => ({ kind, info: KIND_INFO[kind], items: items.filter((i) => i.kind === kind) })).filter(
    (g) => g.items.length > 0,
  );

/** ¿Se puede marcar para asentar? Sólo lo asentable que sigue sin asentar. */
export const isSelectable = (item: MpReconciliationItem): boolean => item.appliable && item.status === 'pending';

/** Las diferencias del grupo que se pueden marcar. */
export const selectableIds = (items: MpReconciliationItem[]): string[] =>
  items.filter(isSelectable).map((i) => i.itemId);

/** Los retiros marcados que todavía no tienen caja de destino. */
export const missingBoxes = (
  items: MpReconciliationItem[],
  selected: ReadonlySet<string>,
  boxes: Readonly<Record<string, string>>,
): MpReconciliationItem[] => items.filter((i) => selected.has(i.itemId) && i.needsCashBox && !boxes[i.itemId]);

/** El cuerpo de Aplicar: lo marcado, con la caja de destino de los retiros. */
export const toApplyBody = (
  items: MpReconciliationItem[],
  selected: ReadonlySet<string>,
  boxes: Readonly<Record<string, string>>,
  distributorId: string,
): ApplyMpReconciliationBody => {
  const chosen = items.filter((i) => selected.has(i.itemId) && isSelectable(i));
  return {
    items: chosen.map((i) =>
      i.needsCashBox ? { itemId: i.itemId, cashBoxId: boxes[i.itemId] } : { itemId: i.itemId },
    ),
    // Las diferencias de la cuenta se asientan una sola vez en todo el sistema: la distribuidora va explícita.
    ...(chosen.some((i) => i.accountLevel) ? { distributorId } : {}),
  };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Qué pasó al aplicar: lo asentado y lo que la caja rechazó. */
export const applySummary = (result: MpApply): { text: string; complete: boolean } => {
  const parts = [plural(result.applied, 'ajuste asentado', 'ajustes asentados')];
  if (result.alreadyApplied > 0) {
    parts.push(plural(result.alreadyApplied, 'ya estaba asentado', 'ya estaban asentados'));
  }
  if (result.failed > 0) parts.push(plural(result.failed, 'no se pudo asentar', 'no se pudieron asentar'));
  return { text: parts.join('; '), complete: result.failed === 0 };
};

/** Por qué no se asentó cada una de las que fallaron. */
export const failureMessages = (result: MpApply): Record<string, string> =>
  Object.fromEntries(
    result.results.filter((r) => r.outcome === 'failed').map((r) => [r.itemId, r.message ?? 'No se pudo asentar']),
  );

/** «Mercado Pago $X · Caja $Y · Diferencia $Z» según lo que traiga la diferencia. */
export const amountsLine = (item: MpReconciliationItem): string => {
  const parts: string[] = [];
  if (item.mpAmount !== null) parts.push(`Mercado Pago ${formatCurrencyExact(item.mpAmount)}`);
  if (item.ledgerAmount !== null) parts.push(`Caja ${formatCurrencyExact(item.ledgerAmount)}`);
  if (item.difference !== null) parts.push(`Diferencia ${formatCurrencyExact(item.difference)}`);
  if (item.extraAmount !== null) parts.push(`Comisión ${formatCurrencyExact(item.extraAmount)}`);
  return parts.join(' · ');
};

/** Cuántas diferencias hay por asentar y cuántas ya se asentaron. */
export const countsOf = (items: MpReconciliationItem[]): { pending: number; applied: number } => ({
  pending: items.filter(isSelectable).length,
  applied: items.filter((i) => i.status === 'applied').length,
});

/** Cuánto más neto informa Mercado Pago que lo que tiene la caja en el rango (negativo: la caja tiene más). */
export const netGap = (summary: MpSummary): number => Math.round((summary.mp.net - summary.cash.net) * 100) / 100;
