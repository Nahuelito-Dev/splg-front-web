import { z } from 'zod';
import type { ProcessConfigBody } from '../../services/api/moduleConfig';
import type { ProcessConfig, ProcessConfigField } from '../../services/api/types';

/** Los campos del formulario viajan como texto: la persona tipea y la validación decide si es un número. */
export type ProcessFormValues = Record<string, string>;

export const processValues = (config: ProcessConfig): ProcessFormValues =>
  Object.fromEntries(config.fields.map((f) => [f.key, String(config.params[f.key] ?? f.default)]));

const rangeMessage = (field: ProcessConfigField) =>
  `${field.type === 'integer' ? 'Un entero' : 'Un número'} entre ${field.min} y ${field.max}`;

const fieldSchema = (field: ProcessConfigField) =>
  z.string().superRefine((raw, ctx) => {
    const text = raw.trim();
    const value = Number(text);
    const valid =
      text !== '' &&
      Number.isFinite(value) &&
      value >= field.min &&
      value <= field.max &&
      (field.type === 'number' || Number.isInteger(value));
    if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, message: rangeMessage(field) });
  });

/**
 * El horario del servicio express: el fin tiene que ser posterior al inicio (es la única regla que cruza campos, la
 * misma que valida el back).
 */
const crossRules = (process: string, values: ProcessFormValues, ctx: z.RefinementCtx) => {
  if (process !== 'express_dispatch') return;
  const start = Number(values.serviceStartHour);
  const end = Number(values.serviceEndHour);
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['serviceEndHour'],
      message: 'Tiene que ser posterior al inicio del servicio',
    });
  }
};

/** Esquema de zod armado con el esquema que publica el back para ese proceso (rango y tipo de cada campo). */
export const buildProcessSchema = (config: ProcessConfig) =>
  z
    .object(Object.fromEntries(config.fields.map((f) => [f.key, fieldSchema(f)])))
    .superRefine((values, ctx) => crossRules(config.process, values as ProcessFormValues, ctx));

/**
 * Lo que se manda: sólo los parámetros que difieren del valor por omisión, así los que la persona no tocó siguen
 * rigiendo por omisión (y no quedan fijados) y un formulario sin cambios restablece todo.
 */
export const toProcessBody = (config: ProcessConfig, values: ProcessFormValues): ProcessConfigBody =>
  Object.fromEntries(
    config.fields
      .map((f) => [f.key, Number(values[f.key])] as const)
      .filter(([key, value]) => value !== config.fields.find((f) => f.key === key)?.default),
  );

/** «1 a 30 días» / «0,5 a 50 km». */
export const rangeHint = (field: ProcessConfigField): string =>
  `${field.min} a ${field.max}${field.unit ? ` ${field.unit}` : ''}`;
