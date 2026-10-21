import { z } from 'zod';
import { isFutureMoment } from '../../utils/dates';
import { argentinaDay } from '../../utils/format';

/** Un número opcional: en el formulario el campo puede quedar vacío. */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    schema.optional(),
  );

/** La misma tolerancia de reloj del back (5 minutos) para fechas que no pueden ser futuras. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

const optionalText = (max: number) => z.string().trim().max(max, `No puede tener más de ${max} caracteres`);

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `No puede tener más de ${max} caracteres`);

const decimals = (max: number) => (value: number) => Math.abs(value * 10 ** max - Math.round(value * 10 ** max)) < 1e-6;

/** Un número obligatorio: el campo vacío es un error, no un cero. */
const required = (label: string) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.coerce.number({ required_error: `Ingresá ${label}`, invalid_type_error: `Ingresá ${label}` }),
  );

/** Importe con hasta `places` decimales. */
const money = (label: string, places = 2) =>
  required(label).pipe(z.number().refine(decimals(places), `Hasta ${places} decimales`));

/** Tope del kilometraje que acepta el back (`MAXIMO_ODOMETRO_KM`): lo que pasa de acá es un error de tipeo. */
export const MAX_ODOMETER_KM = 2_000_000;

/** Un kilometraje: entero, no negativo y dentro del tope del back. */
const kilometers = () =>
  required('el kilometraje').pipe(
    z
      .number()
      .int('Tiene que ser un número entero')
      .nonnegative('No puede ser negativo')
      .max(MAX_ODOMETER_KM, `No puede pasar de ${MAX_ODOMETER_KM.toLocaleString('es-AR')} km`),
  );

/** Una fecha de calendario `YYYY-MM-DD` (lo que manda un `<input type="date">`). */
const day = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const FUEL_TYPE_OPTIONS = [
  { value: 'diesel', label: 'Gasoil' },
  { value: 'gasoline', label: 'Nafta' },
  { value: 'cng', label: 'GNC' },
  { value: 'lpg', label: 'GLP' },
];

export const FUEL_PAYMENT_OPTIONS = [
  { value: 'cash_box', label: 'Caja' },
  { value: 'driver_cash', label: 'Efectivo del chofer' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'fuel_account', label: 'Cuenta corriente de combustible' },
];

/**
 * La misma regla del back (CU-195): el importe coincide con los litros por el precio por litro, con una tolerancia
 * del 1 %. Se avisa en el formulario antes de mandar; la API es la que decide.
 */
export const expectedFuelAmount = (liters: number, unitPrice: number): number =>
  Math.round(liters * unitPrice * 100) / 100;

export const fuelAmountMatches = (liters: number, unitPrice: number, totalAmount: number): boolean => {
  const expected = liters * unitPrice;
  return Math.abs(totalAmount - expected) <= expected * 0.01 + 1e-9;
};

/** Cuántos litros entran en el tanque (capacidad + 5 %); sin capacidad cargada no se controla. */
export const fuelFitsTank = (liters: number, capacity: number | null | undefined): boolean =>
  capacity == null || liters <= capacity * 1.05 + 1e-9;

/** `CreateFuelLoadDto`/`UpdateFuelLoadDto`. El combustible vacío toma el del vehículo. */
export const fuelLoadSchema = z
  .object({
    carId: z.string().trim().min(1, 'Elegí el vehículo'),
    loadedAt: z
      .string()
      .trim()
      .refine((value) => !isFutureMoment(value, FUTURE_TOLERANCE_MS), 'La carga no puede ser futura'),
    fuelType: z.union([z.literal(''), z.enum(['diesel', 'gasoline', 'cng', 'lpg'])]),
    liters: money('los litros').pipe(z.number().positive('Tienen que ser más que cero')),
    unitPrice: money('el precio por litro', 3).pipe(z.number().positive('Tiene que ser mayor a cero')),
    totalAmount: money('el importe').pipe(z.number().nonnegative('No puede ser negativo')),
    odometerKm: kilometers(),
    isFullTank: z.boolean(),
    station: optionalText(120),
    paymentMethod: z.enum(['cash_box', 'driver_cash', 'card', 'fuel_account'], { message: 'Elegí el medio de pago' }),
    receiptNumber: optionalText(40),
    notes: optionalText(2000),
    odometerCorrection: z.boolean(),
    odometerCorrectionNote: optionalText(500),
  })
  .superRefine((values, ctx) => {
    if (!fuelAmountMatches(values.liters, values.unitPrice, values.totalAmount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['totalAmount'],
        message: `No coincide con los litros por el precio por litro (${expectedFuelAmount(values.liters, values.unitPrice)}, con 1 % de tolerancia)`,
      });
    }
    if (values.odometerCorrection && !values.odometerCorrectionNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['odometerCorrectionNote'],
        message: 'Explicá por qué se corrige el kilometraje',
      });
    }
  });

export type FuelLoadFormValues = z.infer<typeof fuelLoadSchema>;

/** `CreateTrafficFineDto`/`UpdateTrafficFineDto`. */
export const trafficFineSchema = z
  .object({
    carId: z.string().trim().min(1, 'Elegí el vehículo'),
    occurredAt: z
      .string()
      .trim()
      .min(1, 'Ingresá cuándo ocurrió')
      .refine((value) => !isFutureMoment(value, FUTURE_TOLERANCE_MS), 'La infracción no puede ser futura'),
    jurisdiction: requiredText(80, 'Ingresá la jurisdicción'),
    actNumber: requiredText(40, 'Ingresá el número de acta'),
    infraction: requiredText(1000, 'Ingresá la infracción'),
    amount: money('el importe').pipe(z.number().positive('Tiene que ser mayor a cero')),
    voluntaryPaymentAmount: optionalNumber(
      z.coerce.number({ invalid_type_error: 'Importe inválido' }).positive('Tiene que ser mayor a cero'),
    ),
    dueDate: z.string().trim(),
    employeeId: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.voluntaryPaymentAmount !== undefined && values.voluntaryPaymentAmount > values.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['voluntaryPaymentAmount'],
        message: 'No puede superar el importe de la multa',
      });
    }
    // Igual que el back: el vencimiento no puede ser anterior al día de la infracción.
    if (values.dueDate && values.occurredAt) {
      const occurred = new Date(values.occurredAt);
      if (!Number.isNaN(occurred.getTime()) && values.dueDate < argentinaDay(occurred)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dueDate'],
          message: 'El vencimiento no puede ser anterior a la fecha de la infracción',
        });
      }
    }
  });

export type TrafficFineFormValues = z.infer<typeof trafficFineSchema>;

/**
 * `PayTrafficFineDto`: la fecha de pago no puede ser posterior a hoy ni anterior a la infracción (días argentinos,
 * como `TrafficFineService.pagar`).
 */
export const payFineSchema = (today: string, occurredAt?: string | null) =>
  z.object({
    paidAt: day('Ingresá la fecha de pago')
      .refine((value) => value <= today, 'El pago no puede ser posterior a hoy')
      .refine(
        (value) => !occurredAt || value >= argentinaDay(occurredAt),
        'El pago no puede ser anterior a la fecha de la infracción',
      ),
    paidAmount: money('lo pagado').pipe(z.number().positive('Tiene que ser mayor a cero')),
    paidInCash: z.boolean(),
  });

export type PayFineFormValues = z.infer<ReturnType<typeof payFineSchema>>;

/** `CreateVehicleAccidentDto`/`UpdateVehicleAccidentDto`. El punto es «latitud,longitud». */
export const parseLatLng = (text: string): { lat: number; lng: number } | null => {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

export const accidentSchema = z.object({
  carId: z.string().trim().min(1, 'Elegí el vehículo'),
  occurredAt: z
    .string()
    .trim()
    .min(1, 'Ingresá cuándo ocurrió')
    .refine((value) => !isFutureMoment(value, FUTURE_TOLERANCE_MS), 'El siniestro no puede ser futuro'),
  location: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || parseLatLng(value) !== null,
      'Tiene que ser «latitud,longitud», p. ej. -27.3671,-55.8961',
    ),
  address: optionalText(300),
  description: requiredText(2000, 'Contá qué pasó'),
  injuries: z.boolean(),
  thirdPartiesInvolved: z.boolean(),
  hazmatRelease: z.boolean(),
  policeReportNumber: optionalText(40),
  insurerClaimNumber: optionalText(40),
  vehicleUnusable: z.boolean(),
  status: z.enum(['reported', 'under_review', 'repairing']),
});

export type AccidentFormValues = z.infer<typeof accidentSchema>;

/** Los estados a los que se puede pasar desde el actual: el mismo o el siguiente del ciclo (el cierre es aparte). */
export const nextAccidentStatuses = (current: 'reported' | 'under_review' | 'repairing' | 'closed') => {
  const cycle = ['reported', 'under_review', 'repairing'] as const;
  const i = cycle.indexOf(current as (typeof cycle)[number]);
  return i < 0 ? [] : cycle.slice(i, i + 2);
};

/** `CloseVehicleAccidentDto`: los tres importes, no negativos. */
export const closeAccidentSchema = z.object({
  repairCost: money('el costo de la reparación').pipe(z.number().nonnegative('No puede ser negativo')),
  insurerReimbursement: money('el reintegro').pipe(z.number().nonnegative('No puede ser negativo')),
  deductibleAmount: money('la franquicia').pipe(z.number().nonnegative('No puede ser negativo')),
});

export type CloseAccidentFormValues = z.infer<typeof closeAccidentSchema>;

/** `CreateTireDto`. */
export const tireSchema = z.object({
  serialNumber: requiredText(60, 'Ingresá el número de serie'),
  brand: requiredText(60, 'Ingresá la marca'),
  size: requiredText(40, 'Ingresá la medida'),
  cost: money('el costo').pipe(z.number().nonnegative('No puede ser negativo')),
});

export type TireFormValues = z.infer<typeof tireSchema>;

export const TIRE_EVENT_OPTIONS = [
  { value: 'mount', label: 'Montaje' },
  { value: 'unmount', label: 'Desmontaje' },
  { value: 'rotate', label: 'Rotación' },
  { value: 'retread', label: 'Recapado' },
  { value: 'retire', label: 'Baja definitiva' },
];

/** Qué movimientos admite un neumático según su estado (las mismas reglas del back, CU-206). */
export const tireEventsFor = (status: 'in_stock' | 'mounted' | 'retired') => {
  if (status === 'in_stock') return ['mount', 'retread', 'retire'] as const;
  if (status === 'mounted') return ['unmount', 'rotate', 'retire'] as const;
  return [] as const;
};

/** `CreateTireEventDto`: el vehículo y la posición hacen falta para montar, y la posición para rotar. */
export const tireEventSchema = z
  .object({
    type: z.enum(['mount', 'unmount', 'rotate', 'retread', 'retire'], { message: 'Elegí el movimiento' }),
    odometerKm: kilometers(),
    carId: z.string().trim(),
    position: z
      .string()
      .trim()
      .regex(/^([A-Za-z0-9]{1,6})?$/, 'Hasta 6 letras o números, p. ej. DI'),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'mount' && !values.carId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['carId'], message: 'Elegí el vehículo' });
    }
    if ((values.type === 'mount' || values.type === 'rotate') && !values.position) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['position'], message: 'Ingresá la posición (p. ej. DI)' });
    }
  });

export type TireEventFormValues = z.infer<typeof tireEventSchema>;
