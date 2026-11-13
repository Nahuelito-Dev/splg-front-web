import { z } from 'zod';
import type { DispatchConfigBody } from '../../services/api/types';

/** Mismos límites que el DTO del back (`DispatchConfigDto`, docs/PARAMETROS-DESPACHO.md). */
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 100;
export const RADIUS_STEPS_MAX = 8;
export const OFFER_TTL_MIN_SECONDS = 10;
export const OFFER_TTL_MAX_SECONDS = 300;
export const FINISHING_RADIUS_MIN_METERS = 0;
export const FINISHING_RADIUS_MAX_METERS = 5000;

export interface DispatchErrors {
  /** Un mensaje por paso (misma posición que la lista); `undefined` si el paso está bien. */
  steps: (string | undefined)[];
  /** Errores de la lista entera (cantidad de pasos). */
  list?: string;
  ttl?: string;
  finishing?: string;
}

const toNumber = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw));

/** Valida lo tipeado con las reglas del back: 1 a 8 pasos, 1 a 100 km y estrictamente crecientes; ventana 10 a 300 s; radio de «por terminar» 0 a 5000 m. */
export const validateDispatch = (steps: string[], ttl: string, finishing: string): DispatchErrors => {
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

  const ttlValue = toNumber(ttl);
  if (!Number.isInteger(ttlValue)) errors.ttl = 'Ingresá un número entero de segundos';
  else if (ttlValue < OFFER_TTL_MIN_SECONDS || ttlValue > OFFER_TTL_MAX_SECONDS) {
    errors.ttl = `Tiene que estar entre ${OFFER_TTL_MIN_SECONDS} y ${OFFER_TTL_MAX_SECONDS} segundos`;
  }

  const finishingValue = toNumber(finishing);
  if (!Number.isInteger(finishingValue)) errors.finishing = 'Ingresá un número entero de metros';
  else if (finishingValue < FINISHING_RADIUS_MIN_METERS || finishingValue > FINISHING_RADIUS_MAX_METERS) {
    errors.finishing = `Tiene que estar entre ${FINISHING_RADIUS_MIN_METERS} y ${FINISHING_RADIUS_MAX_METERS} metros`;
  }
  return errors;
};

export const hasDispatchErrors = (errors: DispatchErrors): boolean =>
  Boolean(errors.list || errors.ttl || errors.finishing || errors.steps.some(Boolean));

/** Lo que tipea la persona: cada paso en su propio objeto (lo pide `useFieldArray`) y la ventana como texto. */
export interface DispatchFormValues {
  steps: { value: string }[];
  ttl: string;
  finishing: string;
}

/** El esquema del formulario: las reglas de `validateDispatch`, con cada mensaje en el campo que corresponde. */
export const dispatchSchema = z
  .object({ steps: z.array(z.object({ value: z.string() })), ttl: z.string(), finishing: z.string() })
  .superRefine((values, ctx) => {
    const errors = validateDispatch(
      values.steps.map((step) => step.value),
      values.ttl,
      values.finishing,
    );
    errors.steps.forEach((message, index) => {
      if (message) ctx.addIssue({ code: 'custom', message, path: ['steps', index, 'value'] });
    });
    if (errors.list) ctx.addIssue({ code: 'custom', message: errors.list, path: ['steps'] });
    if (errors.ttl) ctx.addIssue({ code: 'custom', message: errors.ttl, path: ['ttl'] });
    if (errors.finishing) ctx.addIssue({ code: 'custom', message: errors.finishing, path: ['finishing'] });
  });

/** El cuerpo del PUT a partir de lo tipeado (sólo llamar si no hay errores). */
export const toDispatchBody = (values: DispatchFormValues): Partial<DispatchConfigBody> => ({
  radiusStepsKm: values.steps.map((step) => Number(step.value)),
  offerTtlSeconds: Number(values.ttl),
  finishingRadiusMeters: Number(values.finishing),
});
