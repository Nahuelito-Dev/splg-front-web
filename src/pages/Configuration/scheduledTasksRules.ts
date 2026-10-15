import { z } from 'zod';
import type { ScheduledTasksConfigBody } from '../../services/api/types';

export type IntervalField = Exclude<keyof ScheduledTasksConfigBody, 'fleetAlertHour'>;

export const MAX_INTERVAL_SECONDS = 86400;
export const FLEET_ALERT_HOUR_MAX = 23;

export interface TaskDefinition {
  field: IntervalField;
  label: string;
  help: string;
  /** Cada cuántos segundos «late» la tarea: el intervalo tiene que ser múltiplo entero de esto. */
  tickSeconds: number;
  /** Tope del intervalo; por omisión, 24 h. */
  maxSeconds?: number;
}

/** Los tics y las reglas son los del back (docs/PARAMETROS-DESPACHO.md, CU-173). */
export const TASKS: TaskDefinition[] = [
  {
    field: 'dispatchRetrySeconds',
    label: 'Reintentos del despacho',
    help: 'Cada cuánto se reintenta ofrecer los pedidos con oferta vencida o sin chofer. Como máximo 5 minutos.',
    tickSeconds: 15,
    maxSeconds: 300,
  },
  {
    field: 'reservationActivationSeconds',
    label: 'Activación de reservas',
    help: 'Cada cuánto se activan las reservas cuya seña ya se pagó.',
    tickSeconds: 300,
  },
  {
    field: 'unpaidReservationExpirySeconds',
    label: 'Vencimiento de reservas sin seña',
    help: 'Cada cuánto se dan de baja las reservas que no pagaron la seña.',
    tickSeconds: 3600,
  },
  {
    field: 'unpaidMercadoPagoExpirySeconds',
    label: 'Vencimiento de pedidos sin pagar (MercadoPago)',
    help: 'Cada cuánto se cancelan los pedidos de MercadoPago que quedaron sin pagar.',
    tickSeconds: 1800,
  },
];

export type Unit = 'seconds' | 'minutes' | 'hours';
export const UNIT_SECONDS: Record<Unit, number> = { seconds: 1, minutes: 60, hours: 3600 };
export const UNIT_LABELS: Record<Unit, string> = { seconds: 'segundos', minutes: 'minutos', hours: 'horas' };

/** La unidad más grande en la que el intervalo da un entero (900 s → 15 minutos). */
export const bestUnit = (seconds: number): Unit =>
  seconds > 0 && seconds % 3600 === 0 ? 'hours' : seconds > 0 && seconds % 60 === 0 ? 'minutes' : 'seconds';

const plural = (n: number, singular: string, pluralForm: string) => `${n} ${n === 1 ? singular : pluralForm}`;

/** «15 segundos», «5 minutos», «1 hora»; lo que no da entero se parte («1 h 30 min»). */
export const formatInterval = (seconds: number): string => {
  if (seconds % 3600 === 0) return plural(seconds / 3600, 'hora', 'horas');
  if (seconds % 60 === 0) {
    const hours = Math.floor(seconds / 3600);
    const minutes = (seconds % 3600) / 60;
    return hours > 0 ? `${hours} h ${minutes} min` : plural(minutes, 'minuto', 'minutos');
  }
  return plural(seconds, 'segundo', 'segundos');
};

/** Valida un intervalo ya pasado a segundos. */
export const validateInterval = (
  seconds: number,
  tickSeconds: number,
  maxSeconds = MAX_INTERVAL_SECONDS,
): string | undefined => {
  if (!Number.isInteger(seconds) || seconds <= 0) return 'Ingresá un número entero mayor que cero';
  if (seconds > maxSeconds) return `No puede superar ${formatInterval(maxSeconds)}`;
  if (seconds % tickSeconds !== 0) return `Tiene que ser múltiplo de ${formatInterval(tickSeconds)}`;
  return undefined;
};

export const validateFleetAlertHour = (hour: number): string | undefined =>
  Number.isInteger(hour) && hour >= 0 && hour <= FLEET_ALERT_HOUR_MAX ? undefined : 'Ingresá una hora entre 0 y 23';

/** Lo que se tipea en una fila: cantidad (texto) y unidad. */
export interface IntervalDraft {
  amount: string;
  unit: Unit;
}

export const toSeconds = ({ amount, unit }: IntervalDraft): number =>
  amount.trim() === '' ? Number.NaN : Number(amount) * UNIT_SECONDS[unit];

export const draftFromSeconds = (seconds: number): IntervalDraft => {
  const unit = bestUnit(seconds);
  return { amount: String(seconds / UNIT_SECONDS[unit]), unit };
};

export type IntervalDrafts = Record<IntervalField, IntervalDraft>;

/** Lo que tipea la persona en el formulario de tareas. */
export interface ScheduledTasksFormValues {
  intervals: IntervalDrafts;
  hour: string;
}

const draftSchema = z.object({ amount: z.string(), unit: z.enum(['seconds', 'minutes', 'hours']) });

/** El esquema del formulario: tic, tope y hora, con el mensaje en el campo que corresponde. */
export const scheduledTasksSchema = z
  .object({
    intervals: z.object({
      dispatchRetrySeconds: draftSchema,
      reservationActivationSeconds: draftSchema,
      unpaidReservationExpirySeconds: draftSchema,
      unpaidMercadoPagoExpirySeconds: draftSchema,
    }),
    hour: z.string(),
  })
  .superRefine((values, ctx) => {
    for (const task of TASKS) {
      const message = validateInterval(toSeconds(values.intervals[task.field]), task.tickSeconds, task.maxSeconds);
      if (message) ctx.addIssue({ code: 'custom', message, path: ['intervals', task.field, 'amount'] });
    }
    const hour = values.hour.trim() === '' ? Number.NaN : Number(values.hour);
    const hourMessage = validateFleetAlertHour(hour);
    if (hourMessage) ctx.addIssue({ code: 'custom', message: hourMessage, path: ['hour'] });
  });

export const toScheduledTasksValues = (config: Required<ScheduledTasksConfigBody>): ScheduledTasksFormValues => ({
  intervals: Object.fromEntries(
    TASKS.map((task) => [task.field, draftFromSeconds(config[task.field])]),
  ) as IntervalDrafts,
  hour: String(config.fleetAlertHour),
});

/** El cuerpo del PUT con todos los campos (sólo llamar si no hay errores). */
export const toScheduledTasksBody = ({ intervals, hour }: ScheduledTasksFormValues): ScheduledTasksConfigBody => ({
  dispatchRetrySeconds: toSeconds(intervals.dispatchRetrySeconds),
  reservationActivationSeconds: toSeconds(intervals.reservationActivationSeconds),
  unpaidReservationExpirySeconds: toSeconds(intervals.unpaidReservationExpirySeconds),
  unpaidMercadoPagoExpirySeconds: toSeconds(intervals.unpaidMercadoPagoExpirySeconds),
  fleetAlertHour: Number(hour),
});
