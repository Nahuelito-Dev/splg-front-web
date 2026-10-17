import { z } from 'zod';
import { argentinaDay } from '../../utils/format';
import type { CylinderInspection, CylinderVigencia, RegisterInspectionBody } from '../../services/api/types';

export const INSPECTION_RESULTS: CylinderInspection['result'][] = ['approved', 'conditional', 'rejected'];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Hoy como YYYY-MM-DD en Buenos Aires: la zona en que el back cuenta los vencimientos, esté donde esté el navegador. */
export const todayDay = (now: Date = new Date()): string => argentinaDay(now);

/** Las mismas reglas que el back (`POST /cylinders/:id/inspections`): sin fecha futura; vencimiento salvo rechazo. */
export const inspectionSchema = z
  .object({
    inspectedAt: z.string().regex(DAY, 'Elegí la fecha de la revisión'),
    result: z.enum(['approved', 'conditional', 'rejected']),
    nextDueAt: z.string(),
    notes: z.string().trim().max(500, 'Hasta 500 caracteres'),
  })
  .superRefine((values, ctx) => {
    if (DAY.test(values.inspectedAt) && values.inspectedAt > todayDay()) {
      ctx.addIssue({ code: 'custom', path: ['inspectedAt'], message: 'La revisión no puede ser futura' });
    }
    if (values.result === 'rejected') return;
    if (!DAY.test(values.nextDueAt)) {
      ctx.addIssue({ code: 'custom', path: ['nextDueAt'], message: 'Elegí hasta cuándo puede circular' });
    } else if (DAY.test(values.inspectedAt) && values.nextDueAt <= values.inspectedAt) {
      ctx.addIssue({ code: 'custom', path: ['nextDueAt'], message: 'Tiene que ser posterior a la revisión' });
    }
  });

export type InspectionFormValues = z.infer<typeof inspectionSchema>;

export const inspectionDefaults = (): InspectionFormValues => ({
  inspectedAt: todayDay(),
  result: 'approved',
  nextDueAt: '',
  notes: '',
});

/**
 * El cuerpo del POST. Las fechas viajan como día (`YYYY-MM-DD`), sin hora ni zona: el back las toma como días de
 * Buenos Aires. Un rechazo no lleva próximo vencimiento (el back lo fija en la fecha de la revisión).
 */
export const buildInspectionBody = (values: InspectionFormValues): RegisterInspectionBody => ({
  inspectedAt: values.inspectedAt,
  result: values.result,
  ...(values.result !== 'rejected' && { nextDueAt: values.nextDueAt }),
  ...(values.notes.trim() && { notes: values.notes.trim() }),
});

/** «Vence en 12 días», «Vence hoy», «Venció hace 3 días»: el estado de la vigencia en una frase. */
export const daysLabel = (status: CylinderVigencia['status'], daysRemaining: number | null): string => {
  if (daysRemaining === null) return 'Sin fecha de vencimiento';
  if (daysRemaining === 0) return status === 'expired' ? 'Venció hoy' : 'Vence hoy';
  const n = Math.abs(daysRemaining);
  const unit = n === 1 ? 'día' : 'días';
  return daysRemaining > 0 ? `Vence en ${n} ${unit}` : `Venció hace ${n} ${unit}`;
};

/** Ventanas del listado de vencimientos (la API acepta de 1 a 365 días). */
export const WINDOW_DAYS = [7, 15, 30, 60, 90, 180] as const;

/** La ventana de la URL si es una de las ofrecidas; si no, 30 días. */
export const windowDaysOf = (value: string): number => WINDOW_DAYS.find((d) => String(d) === value) ?? 30;
