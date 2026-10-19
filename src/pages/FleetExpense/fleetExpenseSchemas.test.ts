import { describe, expect, it } from 'vitest';
import {
  accidentSchema,
  closeAccidentSchema,
  expectedFuelAmount,
  fuelAmountMatches,
  fuelFitsTank,
  fuelLoadSchema,
  nextAccidentStatuses,
  parseLatLng,
  payFineSchema,
  tireEventSchema,
  tireEventsFor,
  tireSchema,
  trafficFineSchema,
} from './fleetExpenseSchemas';

const fuel = {
  carId: 'c1',
  loadedAt: '',
  fuelType: '',
  liters: '40',
  unitPrice: '1000',
  totalAmount: '40000',
  odometerKm: '1000',
  isFullTank: true,
  station: '',
  paymentMethod: 'card',
  receiptNumber: '',
  notes: '',
  odometerCorrection: false,
  odometerCorrectionNote: '',
};

describe('carga de combustible', () => {
  it('acepta una carga coherente', () => {
    expect(fuelLoadSchema.safeParse(fuel).success).toBe(true);
  });

  it('el importe se tolera hasta 1 % y no más', () => {
    expect(fuelAmountMatches(40, 1000, 40399)).toBe(true);
    expect(fuelAmountMatches(40, 1000, 40401)).toBe(false);
    const res = fuelLoadSchema.safeParse({ ...fuel, totalAmount: '50000' });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]).toMatchObject({ path: ['totalAmount'] });
    expect(expectedFuelAmount(40.5, 1050.5)).toBe(42545.25);
  });

  it('los litros entran en el tanque con 5 % de tolerancia; sin capacidad no se controla', () => {
    expect(fuelFitsTank(63, 60)).toBe(true);
    expect(fuelFitsTank(63.1, 60)).toBe(false);
    expect(fuelFitsTank(500, null)).toBe(true);
  });

  it('exige vehículo, medio de pago, litros y precio positivos y kilometraje entero', () => {
    expect(fuelLoadSchema.safeParse({ ...fuel, carId: '' }).success).toBe(false);
    expect(fuelLoadSchema.safeParse({ ...fuel, paymentMethod: '' }).success).toBe(false);
    expect(fuelLoadSchema.safeParse({ ...fuel, liters: '0', totalAmount: '0' }).success).toBe(false);
    expect(fuelLoadSchema.safeParse({ ...fuel, unitPrice: '-1' }).success).toBe(false);
    expect(fuelLoadSchema.safeParse({ ...fuel, odometerKm: '10.5' }).success).toBe(false);
    expect(fuelLoadSchema.safeParse({ ...fuel, odometerKm: '' }).success).toBe(false);
  });

  it('corregir el kilometraje exige la nota', () => {
    const res = fuelLoadSchema.safeParse({ ...fuel, odometerCorrection: true });
    expect(res.error?.issues[0]).toMatchObject({ path: ['odometerCorrectionNote'] });
    expect(
      fuelLoadSchema.safeParse({ ...fuel, odometerCorrection: true, odometerCorrectionNote: 'Cambio de tablero' })
        .success,
    ).toBe(true);
  });
});

describe('multa', () => {
  const fine = {
    carId: 'c1',
    occurredAt: '2026-10-10T12:00',
    jurisdiction: 'Posadas',
    actNumber: 'A-1',
    infraction: 'Exceso de velocidad',
    amount: '85000',
    voluntaryPaymentAmount: '',
    dueDate: '',
    employeeId: '',
  };

  it('acepta los datos mínimos y deja vacío el pago voluntario', () => {
    const res = trafficFineSchema.safeParse(fine);
    expect(res.success).toBe(true);
    expect(res.data?.voluntaryPaymentAmount).toBeUndefined();
  });

  it('el pago voluntario no supera el importe', () => {
    const res = trafficFineSchema.safeParse({ ...fine, voluntaryPaymentAmount: '90000' });
    expect(res.error?.issues[0]).toMatchObject({ path: ['voluntaryPaymentAmount'] });
  });

  it('exige jurisdicción, acta e infracción y un importe positivo', () => {
    for (const patch of [{ jurisdiction: ' ' }, { actNumber: '' }, { infraction: '' }, { amount: '0' }]) {
      expect(trafficFineSchema.safeParse({ ...fine, ...patch }).success).toBe(false);
    }
  });

  it('el pago no puede ser de una fecha futura ni de importe cero', () => {
    const schema = payFineSchema('2026-10-17');
    const paid = { paidInCash: false };
    expect(schema.safeParse({ paidAt: '2026-10-17', paidAmount: '59500', ...paid }).success).toBe(true);
    expect(schema.safeParse({ paidAt: '2026-10-18', paidAmount: '59500', ...paid }).success).toBe(false);
    expect(schema.safeParse({ paidAt: '2026-10-17', paidAmount: '0', ...paid }).success).toBe(false);
    expect(schema.safeParse({ paidAt: '', paidAmount: '10', ...paid }).success).toBe(false);
  });
});

describe('siniestro', () => {
  const accident = {
    carId: 'c1',
    occurredAt: '2026-10-10T12:00',
    location: '',
    address: '',
    description: 'Choque',
    injuries: false,
    thirdPartiesInvolved: false,
    hazmatRelease: false,
    policeReportNumber: '',
    insurerClaimNumber: '',
    vehicleUnusable: false,
    status: 'reported',
  };

  it('el punto es opcional, pero si está tiene que ser «latitud,longitud» válido', () => {
    expect(accidentSchema.safeParse(accident).success).toBe(true);
    expect(accidentSchema.safeParse({ ...accident, location: '-27.3671,-55.8961' }).success).toBe(true);
    expect(accidentSchema.safeParse({ ...accident, location: '95,200' }).success).toBe(false);
    expect(accidentSchema.safeParse({ ...accident, location: 'acá' }).success).toBe(false);
    expect(parseLatLng(' -27.3, -55.9 ')).toEqual({ lat: -27.3, lng: -55.9 });
    expect(parseLatLng('12')).toBeNull();
  });

  it('exige la descripción', () => {
    expect(accidentSchema.safeParse({ ...accident, description: ' ' }).success).toBe(false);
  });

  it('desde cada estado sólo se puede quedar o pasar al siguiente; el cierre es aparte', () => {
    expect(nextAccidentStatuses('reported')).toEqual(['reported', 'under_review']);
    expect(nextAccidentStatuses('under_review')).toEqual(['under_review', 'repairing']);
    expect(nextAccidentStatuses('repairing')).toEqual(['repairing']);
    expect(nextAccidentStatuses('closed')).toEqual([]);
  });

  it('el cierre acepta ceros y rechaza importes negativos', () => {
    const ok = { repairCost: '350000', insurerReimbursement: '0', deductibleAmount: '0' };
    expect(closeAccidentSchema.safeParse(ok).success).toBe(true);
    expect(closeAccidentSchema.safeParse({ ...ok, repairCost: '-1' }).success).toBe(false);
    expect(closeAccidentSchema.safeParse({ ...ok, insurerReimbursement: '' }).success).toBe(false);
  });
});

describe('neumáticos', () => {
  it('el alta pide serie, marca, medida y un costo no negativo', () => {
    const ok = { serialNumber: 'S-1', brand: 'Pirelli', size: '215/75', cost: '1000' };
    expect(tireSchema.safeParse(ok).success).toBe(true);
    expect(tireSchema.safeParse({ ...ok, serialNumber: '' }).success).toBe(false);
    expect(tireSchema.safeParse({ ...ok, cost: '-1' }).success).toBe(false);
  });

  it('cada estado admite sus movimientos', () => {
    expect(tireEventsFor('in_stock')).toEqual(['mount', 'retread', 'retire']);
    expect(tireEventsFor('mounted')).toEqual(['unmount', 'rotate', 'retire']);
    expect(tireEventsFor('retired')).toEqual([]);
  });

  it('montar pide vehículo y posición; rotar, la posición; el resto, sólo el kilometraje', () => {
    const base = { odometerKm: '100', carId: '', position: '' };
    expect(tireEventSchema.safeParse({ ...base, type: 'mount' }).success).toBe(false);
    expect(tireEventSchema.safeParse({ ...base, type: 'mount', carId: 'c1', position: 'DI' }).success).toBe(true);
    expect(tireEventSchema.safeParse({ ...base, type: 'rotate' }).success).toBe(false);
    expect(tireEventSchema.safeParse({ ...base, type: 'rotate', position: 'TD' }).success).toBe(true);
    expect(tireEventSchema.safeParse({ ...base, type: 'unmount' }).success).toBe(true);
    expect(tireEventSchema.safeParse({ ...base, type: 'retire', odometerKm: '' }).success).toBe(false);
    expect(tireEventSchema.safeParse({ ...base, type: 'unmount', position: 'demasiado-larga' }).success).toBe(false);
  });
});
