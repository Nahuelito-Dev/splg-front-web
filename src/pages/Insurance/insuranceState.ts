import type { InsuranceInstallment } from '../../services/api/types';
import { INSURANCE_INSTALLMENT_STATUS, type Label } from '../../utils/statusLabels';

/** Días de aviso antes del vencimiento: coincide con el aviso «la cuota del seguro vence en 5 días». */
export const DUE_SOON_DAYS = 5;

const MS_PER_DAY = 86_400_000;

const toUtc = (day: string): number => {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Días de calendario desde `from` hasta `to` (ambos `YYYY-MM-DD`); negativo si `to` ya pasó. */
export const daysBetween = (from: string, to: string): number => Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);

type InstallmentDates = Pick<InsuranceInstallment, 'status' | 'dueDate' | 'graceUntil'>;

/**
 * Lo que ve el admin de una cuota: paga y cancelada tal cual; la pendiente, vencida (pasó la gracia: peligro),
 * en gracia, por vencer (hasta 5 días: aviso) o pendiente a secas. `today` es el día de Buenos Aires.
 */
export const installmentLabel = (installment: InstallmentDates, today: string): Label => {
  if (installment.status !== 'pending') return INSURANCE_INSTALLMENT_STATUS[installment.status];
  if (daysBetween(installment.graceUntil, today) > 0) return { text: 'Vencida', tone: 'danger' };
  if (daysBetween(installment.dueDate, today) > 0) return { text: 'En gracia', tone: 'warn' };
  const left = daysBetween(today, installment.dueDate);
  if (left <= DUE_SOON_DAYS) {
    return { text: left === 0 ? 'Vence hoy' : left === 1 ? 'Vence mañana' : `Vence en ${left} días`, tone: 'warn' };
  }
  return { text: 'Pendiente', tone: 'neutral' };
};

export interface InstallmentPlan {
  count: number;
  amount: number;
  /** `YYYY-MM-DD` */
  firstDueDate: string;
  graceDays: number;
}

export interface PlannedInstallment {
  label: string;
  dueDate: string;
  graceUntil: string;
  amount: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Suma días a un `YYYY-MM-DD` sin pasar por zonas horarias. */
export const addDays = (day: string, days: number): string => {
  const date = new Date(toUtc(day) + days * MS_PER_DAY);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** El mismo día de cada mes que la primera; si el mes no lo tiene, el último (igual que arma las cuotas el back). */
const dueDateOf = (first: string, index: number): string => {
  const [y, m, d] = first.split('-').map(Number);
  const months = m - 1 + index;
  const year = y + Math.floor(months / 12);
  const month = (months % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(Math.min(d, lastDay))}`;
};

/** Vista previa de las cuotas que va a generar el plan, antes de guardar la póliza. */
export const previewInstallments = (plan: InstallmentPlan): PlannedInstallment[] =>
  Array.from({ length: plan.count }, (_, i) => {
    const dueDate = dueDateOf(plan.firstDueDate, i);
    return {
      label: `${i + 1}/${plan.count}`,
      dueDate,
      graceUntil: addDays(dueDate, plan.graceDays),
      amount: plan.amount,
    };
  });

/**
 * Lo que el back rechaza del plan: la primera cuota no puede vencer antes de que empiece la póliza ni la última
 * después de que vence. Devuelve el motivo, o `null` si el plan entra en la vigencia.
 */
export const planOutOfRange = (plan: PlannedInstallment[], validFrom: string, validTo: string): string | null => {
  // Una vigencia invertida ya la marca el campo `validTo`: no se tapa con el aviso del plan.
  if (plan.length === 0 || !validFrom || !validTo || validTo <= validFrom) return null;
  if (plan[0].dueDate < validFrom) return 'La primera cuota vence antes de que empiece la póliza';
  if (plan[plan.length - 1].dueDate > validTo) return 'La última cuota vence después de que vence la póliza';
  return null;
};
