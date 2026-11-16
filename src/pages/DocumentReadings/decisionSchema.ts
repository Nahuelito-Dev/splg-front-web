import { z } from 'zod';
import { MONEY_FIELDS } from './documentReadingRules';

export interface DecisionValues {
  fields: Record<string, string>;
  cashBoxId: string;
  fleetTaskId: string;
  note: string;
}

interface Options {
  /** Corregir: los campos editables del tipo de documento. Confirmar: ninguno. */
  editable: string[];
  /** Campos con una diferencia que exige corregir: no pueden quedar vacíos. */
  required: string[];
  /** La propuesta registra un pago: la caja es obligatoria. */
  needsCashBox: boolean;
  /** Hay más de una tarea del legajo que se podría renovar: hay que elegir cuál. */
  chooseTask: boolean;
}

const MONEY = /^\d+(\.\d{1,2})?$/;

const fieldRule = (name: string, required: boolean) =>
  z
    .string()
    .trim()
    .max(200, 'Hasta 200 caracteres')
    .refine((v) => !required || v.length > 0, 'Indicá el valor correcto (o repetí el leído para aceptarlo)')
    .refine(
      (v) => !MONEY_FIELDS.has(name) || v === '' || MONEY.test(v),
      'Usá punto decimal y sin separador de miles, p. ej. 29958.00',
    );

/** Las reglas del DTO de confirmar y corregir: caja para un pago, tarea si hay más de una, campos hasta 200, nota hasta 500. */
export const decisionSchema = ({ editable, required, needsCashBox, chooseTask }: Options) =>
  z.object({
    fields: z.object(Object.fromEntries(editable.map((name) => [name, fieldRule(name, required.includes(name))]))),
    cashBoxId: needsCashBox ? z.string().min(1, 'Elegí la caja de la que sale el pago') : z.string(),
    fleetTaskId: chooseTask ? z.string().min(1, 'Elegí qué tarea del legajo se renueva') : z.string(),
    note: z.string().trim().max(500, 'Hasta 500 caracteres'),
  });
