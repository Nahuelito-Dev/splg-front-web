import { z } from 'zod';
import type { ConfirmPlanningCaseBody, ForceWindowBody, ProcessConfig } from '../../../services/api/types';
import { argentinaDay } from '../../../utils/format';
import { buildProcessSchema } from '../../Configuration/processRules';

/** Argentina no tiene horario de verano: el desfasaje contra UTC es -03:00 todo el año. */
const ARGENTINA_OFFSET = '-03:00';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede tener más de ${max} caracteres`)
    .optional()
    .transform((value) => value || undefined);

const cost = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce
    .number({ invalid_type_error: 'Ingresá un importe' })
    .nonnegative('No puede ser negativo')
    .max(10_000_000, 'Es demasiado grande')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Hasta dos decimales')
    .optional(),
);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** El proveedor, el gasto previsto y las notas que se anotan al confirmar un taller. */
const workshopFields = {
  provider: optionalText(120),
  cost,
  notes: optionalText(500),
};

/**
 * La ventana que elige el administrador: un día y el horario de taller. Con `requireWindow` en falso (confirma la
 * que acordó el chofer) esos tres campos no se piden.
 */
export const buildWindowSchema = (requireWindow: boolean, today: () => string = () => argentinaDay(new Date())) =>
  z
    .object({
      day: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      ignoreCoverage: z.boolean().optional(),
      ...workshopFields,
    })
    .superRefine((values, ctx) => {
      if (!requireWindow) return;
      if (!values.day) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['day'], message: 'Elegí el día' });
      else if (values.day < today()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['day'], message: 'La ventana tiene que ser a futuro' });
      }
      for (const field of ['startTime', 'endTime'] as const) {
        if (!TIME.test(values[field])) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Ingresá la hora' });
        }
      }
      if (TIME.test(values.startTime) && TIME.test(values.endTime) && values.endTime <= values.startTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'Tiene que ser posterior al inicio' });
      }
    });

export type WindowFormParsed = z.output<ReturnType<typeof buildWindowSchema>>;

/** La ventana en hora argentina como instantes ISO, lo que espera la API. */
export const toWindow = (values: Pick<WindowFormParsed, 'day' | 'startTime' | 'endTime'>) => ({
  windowStart: `${values.day}T${values.startTime}:00${ARGENTINA_OFFSET}`,
  windowEnd: `${values.day}T${values.endTime}:00${ARGENTINA_OFFSET}`,
});

const workshopBody = (values: WindowFormParsed) => ({
  ...(values.ignoreCoverage ? { ignoreCoverage: true } : {}),
  ...(values.provider ? { provider: values.provider } : {}),
  ...(values.cost !== undefined ? { cost: values.cost } : {}),
  ...(values.notes ? { notes: values.notes } : {}),
});

/** Cuerpo de «confirmar»: sin ventana confirma la que acordó el chofer. */
export const toConfirmBody = (values: WindowFormParsed, chooseWindow: boolean): ConfirmPlanningCaseBody => ({
  ...(chooseWindow ? toWindow(values) : {}),
  ...workshopBody(values),
});

/** Cuerpo de «fijar ventana»: la ventana es obligatoria. */
export const toForceBody = (values: WindowFormParsed): ForceWindowBody => ({
  ...toWindow(values),
  ...workshopBody(values),
});

/**
 * La configuración del planificador: lo del esquema que publica el back (rango y tipo de cada campo) más la regla
 * que cruza dos campos, el taller tiene que empezar antes de terminar.
 */
export const buildSettingsSchema = (config: ProcessConfig) =>
  buildProcessSchema(config).superRefine((values, ctx) => {
    const start = Number(values.workshopStartHour);
    const end = Number(values.workshopEndHour);
    const days = Number(values.workshopDays);
    if (Number.isFinite(days) && (days & 127) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workshopDays'],
        message: 'Elegí al menos un día de taller',
      });
    }
    if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workshopEndHour'],
        message: 'Tiene que ser posterior a la hora de inicio del taller',
      });
    }
  });

/** Los días de la semana de la máscara `workshopDays`, en el orden en que se muestran (lunes a domingo). */
export const WORKSHOP_DAYS: ReadonlyArray<{ bit: number; label: string }> = [
  { bit: 1, label: 'Lunes' },
  { bit: 2, label: 'Martes' },
  { bit: 3, label: 'Miércoles' },
  { bit: 4, label: 'Jueves' },
  { bit: 5, label: 'Viernes' },
  { bit: 6, label: 'Sábado' },
  { bit: 0, label: 'Domingo' },
];

export const hasWorkshopDay = (mask: number, bit: number): boolean => (mask & (1 << bit)) !== 0;

export const toggleWorkshopDay = (mask: number, bit: number, on: boolean): number =>
  on ? mask | (1 << bit) : mask & ~(1 << bit);
