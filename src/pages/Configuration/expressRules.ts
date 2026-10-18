import { z } from 'zod';
import type { ExpressConfig, ExpressConfigBody } from '../../services/api/types';

/** Mismos límites que el DTO del back (`ExpressConfigDto`, docs/EXPRESS-REINTEGROS.md). */
export const SURCHARGE_MAX = 1_000_000;
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 50;
export const OFFER_TTL_MIN_SECONDS = 10;
export const OFFER_TTL_MAX_SECONDS = 120;
export const EXPRESS_MINUTES_MIN = 5;
export const EXPRESS_MINUTES_MAX = 240;
export const STANDARD_MINUTES_MIN = 30;
export const STANDARD_MINUTES_MAX = 1440;

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

const toNumber = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw));
const minutesOf = (hour: string): number => {
  const [h, m] = hour.split(':').map(Number);
  return h * 60 + m;
};

const rangeIssue = (raw: string, min: number, max: number, unit: string, integer: boolean): string | undefined => {
  const value = toNumber(raw);
  if (!Number.isFinite(value)) return `Ingresá un número${unit ? ` de ${unit}` : ''}`;
  if (integer && !Number.isInteger(value)) return 'Tiene que ser un número entero';
  if (value < min || value > max) return `Tiene que estar entre ${min} y ${max}`;
  return undefined;
};

/** Lo que tipea la persona: todo como texto salvo el interruptor. */
export interface ExpressFormValues {
  enabled: boolean;
  surcharge: string;
  radius: string;
  ttl: string;
  from: string;
  to: string;
  estimated: string;
  standardEstimated: string;
}

export const expressSchema = z
  .object({
    enabled: z.boolean(),
    surcharge: z.string(),
    radius: z.string(),
    ttl: z.string(),
    from: z.string(),
    to: z.string(),
    estimated: z.string(),
    standardEstimated: z.string(),
  })
  .superRefine((v, ctx) => {
    const add = (path: keyof ExpressFormValues, message?: string) => {
      if (message) ctx.addIssue({ code: 'custom', message, path: [path] });
    };
    const surcharge = toNumber(v.surcharge);
    add(
      'surcharge',
      !Number.isFinite(surcharge)
        ? 'Ingresá un importe en pesos'
        : surcharge < 0 || surcharge > SURCHARGE_MAX
          ? `Tiene que estar entre 0 y ${SURCHARGE_MAX}`
          : Math.round(surcharge * 100) !== surcharge * 100
            ? 'Hasta 2 decimales'
            : undefined,
    );
    add('radius', rangeIssue(v.radius, RADIUS_MIN_KM, RADIUS_MAX_KM, 'km', false));
    add('ttl', rangeIssue(v.ttl, OFFER_TTL_MIN_SECONDS, OFFER_TTL_MAX_SECONDS, 'segundos', true));
    add('estimated', rangeIssue(v.estimated, EXPRESS_MINUTES_MIN, EXPRESS_MINUTES_MAX, 'minutos', true));
    add(
      'standardEstimated',
      rangeIssue(v.standardEstimated, STANDARD_MINUTES_MIN, STANDARD_MINUTES_MAX, 'minutos', true),
    );
    if (!HOUR.test(v.from)) add('from', 'Formato HH:mm');
    if (!HOUR.test(v.to)) add('to', 'Formato HH:mm');
    if (HOUR.test(v.from) && HOUR.test(v.to) && minutesOf(v.from) >= minutesOf(v.to)) {
      add('to', 'Tiene que ser posterior al inicio (no cruza la medianoche)');
    }
  });

export const valuesOf = (config: ExpressConfig): ExpressFormValues => ({
  enabled: config.enabled,
  surcharge: String(config.surchargeAmount),
  radius: String(config.maxRadiusKm),
  ttl: String(config.offerTtlSeconds),
  from: config.serviceFrom,
  to: config.serviceTo,
  estimated: String(config.estimatedMinutes),
  standardEstimated: String(config.standardEstimatedMinutes),
});

/** El cuerpo del PUT a partir de lo tipeado (sólo llamar si no hay errores). */
export const toExpressBody = (v: ExpressFormValues): ExpressConfigBody => ({
  enabled: v.enabled,
  surchargeAmount: Number(v.surcharge),
  maxRadiusKm: Number(v.radius),
  offerTtlSeconds: Number(v.ttl),
  serviceFrom: v.from,
  serviceTo: v.to,
  estimatedMinutes: Number(v.estimated),
  standardEstimatedMinutes: Number(v.standardEstimated),
});
