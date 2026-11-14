import { describe, expect, it } from 'vitest';
import { sheet, uuid } from '../../test/routeSheetFixtures';
import {
  buildHolidaySchema,
  buildRescheduleSchema,
  buildStopTargetSchema,
  failedStopSchema,
  sheetFormSchema,
} from './routeSheetSchemas';
import {
  closedText,
  dayLabel,
  failedOutcomeText,
  formatMinutes,
  hhmm,
  loadPercent,
  loadText,
  move,
  onlyLateStops,
  returnAtOf,
  startAtOf,
  toggleWorkingDay,
  tomorrow,
} from './routeSheetLabels';

describe('routeSheetLabels', () => {
  it('mañana se cuenta en Buenos Aires: a las 23:30 del 13 (02:30 UTC del 14) sigue siendo el 14', () => {
    expect(tomorrow(new Date('2026-11-14T02:30:00.000Z'))).toBe('2026-11-14');
    expect(tomorrow(new Date('2026-12-31T15:00:00.000Z'))).toBe('2027-01-01');
  });

  it('la salida del formulario es hora argentina del día del plan', () => {
    expect(startAtOf('2026-11-14', '07:45')).toBe('2026-11-14T10:45:00.000Z');
    expect(hhmm('2026-11-14T10:45:00.000Z')).toBe('07:45');
    expect(hhmm(null)).toBe('—');
  });

  it('el regreso es la salida más la duración', () => {
    expect(hhmm(returnAtOf(sheet({ plannedStartAt: '2026-11-14T10:30:00.000Z' })))).toBe('09:05');
    expect(returnAtOf(sheet({ plannedStartAt: null }))).toBeNull();
  });

  it('la carga se mide en unidades si el vehículo las tiene; si no, en kilos', () => {
    expect(loadPercent(sheet({ capacity: { kg: null, units: 6 } }))).toBe(50);
    expect(loadText(sheet({ capacity: { kg: 60, units: null } }))).toBe('30 / 60 kg');
    expect(loadPercent(sheet({ capacity: { kg: null, units: null } }))).toBeNull();
  });

  it('formatMinutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });

  it('move no cambia la lista con índices fuera de rango', () => {
    const list = [1, 2, 3];
    expect(move(list, 0, 3)).toBe(list);
    expect(move(list, 2, 0)).toEqual([3, 1, 2]);
  });

  it('acceptLateStops sólo saltea las paradas tarde', () => {
    expect(onlyLateStops([{ code: 'late_stops', message: '' }])).toBe(true);
    expect(
      onlyLateStops([
        { code: 'late_stops', message: '' },
        { code: 'stops_not_plannable', message: '' },
      ]),
    ).toBe(false);
    expect(onlyLateStops([])).toBe(false);
  });
});

describe('esquemas de los formularios', () => {
  const sheets = [sheet({ id: uuid(1) })];
  const schema = buildStopTargetSchema(sheets);

  it('la posición va de 1 a paradas + 1 (vacío: donde convenga)', () => {
    const base = { targetSheetId: uuid(1), acceptLateStops: false };
    expect(schema.safeParse({ ...base, position: '' }).success).toBe(true);
    expect(schema.safeParse({ ...base, position: '4' }).success).toBe(true);
    expect(schema.safeParse({ ...base, position: '5' }).success).toBe(false);
    expect(schema.safeParse({ ...base, position: '0' }).success).toBe(false);
    expect(schema.safeParse({ ...base, position: '1.5' }).success).toBe(false);
    expect(schema.safeParse({ ...base, targetSheetId: '', position: '' }).success).toBe(false);
  });

  it('la hoja: ids de la lista y hora HH:MM', () => {
    expect(
      sheetFormSchema.safeParse({ deliveryId: '', carId: uuid(20), originWarehouseId: '', startTime: '07:30' }).success,
    ).toBe(true);
    expect(
      sheetFormSchema.safeParse({ deliveryId: 'x', carId: '', originWarehouseId: '', startTime: '' }).success,
    ).toBe(false);
    expect(
      sheetFormSchema.safeParse({ deliveryId: '', carId: '', originWarehouseId: '', startTime: '24:00' }).success,
    ).toBe(false);
    expect(
      sheetFormSchema.safeParse({ deliveryId: '', carId: '', originWarehouseId: 'galpon', startTime: '' }).success,
    ).toBe(false);
  });
});

describe('ejecución: textos y reglas', () => {
  const base = { sheetId: uuid(1), orderId: uuid(2), nextOrderId: null };

  it('«No pude entregar»: requeued con la franja nueva, rescheduled con el día o esperando al admin', () => {
    expect(
      failedOutcomeText('Ana', {
        ...base,
        outcome: 'requeued',
        newWindowStart: '2026-11-14T16:00:00.000Z',
        newWindowEnd: '2026-11-14T17:00:00.000Z',
      }),
    ).toBe('Ana: pasó al final del recorrido. Al cliente se le avisó la franja nueva: 13:00–14:00');
    expect(failedOutcomeText('Ana', { ...base, outcome: 'requeued' })).toBe('Ana: pasó al final del recorrido.');
    expect(failedOutcomeText('Ana', { ...base, outcome: 'rescheduled', rescheduledTo: '2026-11-16' })).toBe(
      'Ana: segundo intento sin entregar. Se reprogramó para el lunes 16/11, sin franja fija',
    );
    expect(failedOutcomeText('Ana', { ...base, outcome: 'rescheduled', rescheduledTo: null })).toBe(
      'Ana: segundo intento sin entregar. No se pudo reprogramar: quedó esperando que decidas',
    );
  });

  it('cierre a mano: cuenta reprogramados y en espera', () => {
    const close = (rescheduled: { orderId: string; scheduledDate: string | null }[]) =>
      closedText({ sheetId: uuid(1), alreadyClosed: false, releasedOrderIds: [], rescheduled });
    expect(close([])).toBe('Hoja cerrada');
    expect(close([{ orderId: uuid(2), scheduledDate: '2026-11-16' }])).toBe(
      'Hoja cerrada: 1 pedido(s) se reprogramaron para el próximo día hábil',
    );
    expect(close([{ orderId: uuid(2), scheduledDate: null }])).toBe('Hoja cerrada: 1 quedaron esperando tu decisión');
  });

  it('días de reparto: la máscara prende y apaga cada bit', () => {
    expect(toggleWorkingDay(63, 64, true)).toBe(127);
    expect(toggleWorkingDay(63, 1, false)).toBe(62);
    expect(toggleWorkingDay(1, 1, false)).toBe(0);
    expect(dayLabel('2026-11-16')).toBe('lunes 16/11');
  });

  it('«No pude entregar»: «Otro» pide nota; una nota escrita va de 3 a 280', () => {
    expect(failedStopSchema.safeParse({ reason: 'other', note: '  ' }).success).toBe(false);
    expect(failedStopSchema.safeParse({ reason: 'rejected', note: 'ab' }).success).toBe(false);
    expect(failedStopSchema.safeParse({ reason: 'rejected', note: '' }).success).toBe(true);
    expect(failedStopSchema.safeParse({ reason: 'other', note: 'x'.repeat(281) }).success).toBe(false);
  });

  it('feriado y nueva fecha: no un día pasado; descripción de 2 a 120', () => {
    const holiday = buildHolidaySchema('2026-11-14');
    expect(holiday.safeParse({ date: '2026-11-14', description: 'Hoy' }).success).toBe(true);
    expect(holiday.safeParse({ date: '2026-11-13', description: 'Ayer' }).success).toBe(false);
    expect(holiday.safeParse({ date: '2026-11-20', description: 'x'.repeat(121) }).success).toBe(false);
    expect(buildRescheduleSchema('2026-11-14').safeParse({ scheduledDate: '' }).success).toBe(false);
  });
});
