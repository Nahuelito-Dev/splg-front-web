import { z } from 'zod';
import type { DispatchConfig, DispatchConfigBody } from '../../services/api/types';

export type DispatchSettingsConfig = DispatchConfig;
export type DispatchSettingsBody = DispatchConfigBody;

/** Mismos límites que el DTO del back (`DispatchConfigDto`, docs/PARAMETROS-DESPACHO.md). */
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 100;
export const RADIUS_STEPS_MAX = 8;
export const OFFER_TTL_MIN_SECONDS = 10;
export const OFFER_TTL_MAX_SECONDS = 300;
export const FINISHING_RADIUS_MIN_METERS = 0;
export const FINISHING_RADIUS_MAX_METERS = 5000;
export const NO_DRIVER_EXPIRY_MIN_MINUTES = 1;
export const NO_DRIVER_EXPIRY_MAX_MINUTES = 1440;
/** Lo que rige en el back si la distribuidora no configuró nada. */
export const NO_DRIVER_EXPIRY_DEFAULT_MINUTES = 120;
export const ARRIVAL_RADIUS_MIN_METERS = 0;
export const ARRIVAL_RADIUS_MAX_METERS = 5000;
/** Lo que rige en el back si la distribuidora no configuró nada (y lo que se muestra si un back viejo no lo manda). */
export const ARRIVAL_RADIUS_DEFAULT_METERS = 150;

export interface DispatchErrors {
  /** Un mensaje por paso (misma posición que la lista); `undefined` si el paso está bien. */
  steps: (string | undefined)[];
  /** Errores de la lista entera (cantidad de pasos). */
  list?: string;
  ttl?: string;
  finishing?: string;
  expiry?: string;
  arrival?: string;
}

const toNumber = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw));

/** Entero dentro de `min..max`; `unit` en plural para el mensaje. */
const wholeInRange = (raw: string, min: number, max: number, unit: string): string | undefined => {
  const value = toNumber(raw);
  if (!Number.isInteger(value)) return `Ingresá un número entero de ${unit}`;
  if (value < min || value > max) return `Tiene que estar entre ${min} y ${max} ${unit}`;
  return undefined;
};

/**
 * Valida lo tipeado con las reglas del back: 1 a 8 pasos, 1 a 100 km y estrictamente crecientes; ventana 10 a 300 s;
 * radio de «por terminar» 0 a 5000 m; vencimiento sin chofer 1 a 1440 min; radio de «Llegué» 0 a 5000 m.
 */
export const validateDispatch = (
  steps: string[],
  ttl: string,
  finishing: string,
  expiry: string,
  arrival: string,
): DispatchErrors => {
  const errors: DispatchErrors = { steps: [] };
  if (steps.length < 1) errors.list = 'Tiene que haber al menos un paso de radio';
  if (steps.length > RADIUS_STEPS_MAX) errors.list = `Como máximo ${RADIUS_STEPS_MAX} pasos de radio`;

  let previous: number | null = null;
  errors.steps = steps.map((raw) => {
    const value = toNumber(raw);
    if (!Number.isFinite(value)) return 'Ingresá un número de km';
    if (value < RADIUS_MIN_KM || value > RADIUS_MAX_KM) {
      previous = value;
      return `Tiene que estar entre ${RADIUS_MIN_KM} y ${RADIUS_MAX_KM} km`;
    }
    const message =
      previous !== null && value <= previous ? `Tiene que ser mayor que el paso anterior (${previous} km)` : undefined;
    previous = value;
    return message;
  });

  errors.ttl = wholeInRange(ttl, OFFER_TTL_MIN_SECONDS, OFFER_TTL_MAX_SECONDS, 'segundos');
  errors.finishing = wholeInRange(finishing, FINISHING_RADIUS_MIN_METERS, FINISHING_RADIUS_MAX_METERS, 'metros');
  errors.expiry = wholeInRange(expiry, NO_DRIVER_EXPIRY_MIN_MINUTES, NO_DRIVER_EXPIRY_MAX_MINUTES, 'minutos');
  errors.arrival = wholeInRange(arrival, ARRIVAL_RADIUS_MIN_METERS, ARRIVAL_RADIUS_MAX_METERS, 'metros');
  return errors;
};

export const hasDispatchErrors = (errors: DispatchErrors): boolean =>
  Boolean(
    errors.list || errors.ttl || errors.finishing || errors.expiry || errors.arrival || errors.steps.some(Boolean),
  );

/** Lo que tipea la persona: cada paso en su propio objeto (lo pide `useFieldArray`) y la ventana como texto. */
export interface DispatchFormValues {
  steps: { value: string }[];
  ttl: string;
  finishing: string;
  expiry: string;
  arrival: string;
}

/** El esquema del formulario: las reglas de `validateDispatch`, con cada mensaje en el campo que corresponde. */
export const dispatchSchema = z
  .object({
    steps: z.array(z.object({ value: z.string() })),
    ttl: z.string(),
    finishing: z.string(),
    expiry: z.string(),
    arrival: z.string(),
  })
  .superRefine((values, ctx) => {
    const errors = validateDispatch(
      values.steps.map((step) => step.value),
      values.ttl,
      values.finishing,
      values.expiry,
      values.arrival,
    );
    errors.steps.forEach((message, index) => {
      if (message) ctx.addIssue({ code: 'custom', message, path: ['steps', index, 'value'] });
    });
    if (errors.list) ctx.addIssue({ code: 'custom', message: errors.list, path: ['steps'] });
    if (errors.ttl) ctx.addIssue({ code: 'custom', message: errors.ttl, path: ['ttl'] });
    if (errors.finishing) ctx.addIssue({ code: 'custom', message: errors.finishing, path: ['finishing'] });
    if (errors.expiry) ctx.addIssue({ code: 'custom', message: errors.expiry, path: ['expiry'] });
    if (errors.arrival) ctx.addIssue({ code: 'custom', message: errors.arrival, path: ['arrival'] });
  });

/** El cuerpo del PUT a partir de lo tipeado (sólo llamar si no hay errores). */
export const toDispatchBody = (values: DispatchFormValues): DispatchSettingsBody => ({
  radiusStepsKm: values.steps.map((step) => Number(step.value)),
  offerTtlSeconds: Number(values.ttl),
  finishingRadiusMeters: Number(values.finishing),
  noDriverExpiryMinutes: Number(values.expiry),
  arrivalRadiusMeters: Number(values.arrival),
});

/** Lo que muestra el formulario; si el back todavía no manda un campo nuevo, rige su valor por omisión. */
export const toDispatchValues = (config: DispatchSettingsConfig): DispatchFormValues => ({
  steps: config.radiusStepsKm.map((km) => ({ value: String(km) })),
  ttl: String(config.offerTtlSeconds),
  finishing: String(config.finishingRadiusMeters),
  expiry: String(config.noDriverExpiryMinutes),
  arrival: String(config.arrivalRadiusMeters),
});
