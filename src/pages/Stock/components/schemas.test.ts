import { describe, expect, it } from 'vitest';
import { adjustmentSchema } from './adjustmentSchema';
import { transferSchema } from './transferSchema';
import { warehouseCreateBody, warehouseSchema, warehouseUpdateBody } from './warehouseSchema';

const adj = {
  locationId: 'l',
  reason: 'shrinkage',
  notes: 'Se rompió',
  items: [{ gasCylinderId: 'g', condition: 'full', amount: 2 }],
};

describe('adjustmentSchema', () => {
  it('acepta una merma', () => expect(adjustmentSchema.safeParse(adj).success).toBe(true));
  it('la nota es obligatoria', () => expect(adjustmentSchema.safeParse({ ...adj, notes: '  ' }).success).toBe(false));
  it('la cantidad no puede ser 0', () =>
    expect(adjustmentSchema.safeParse({ ...adj, items: [{ ...adj.items[0], amount: 0 }] }).success).toBe(false));
  it('un negativo sólo vale en la corrección de conteo', () => {
    const neg = { ...adj, items: [{ ...adj.items[0], amount: -2 }] };
    expect(adjustmentSchema.safeParse(neg).success).toBe(false);
    expect(adjustmentSchema.safeParse({ ...neg, reason: 'count_correction' }).success).toBe(true);
  });
});

const tr = {
  mode: 'warehouses',
  fromWarehouseId: 'a',
  carId: '',
  toWarehouseId: 'b',
  notes: '',
  items: [{ gasCylinderId: 'g', condition: 'full', quantity: 3 }],
};

describe('transferSchema', () => {
  it('entre galpones distintos', () => expect(transferSchema.safeParse(tr).success).toBe(true));
  it('no al mismo galpón', () => expect(transferSchema.safeParse({ ...tr, toWarehouseId: 'a' }).success).toBe(false));
  it('camión -> galpón exige camión y nota', () => {
    const truck = { ...tr, mode: 'truck', fromWarehouseId: '', carId: 'c' };
    expect(transferSchema.safeParse(truck).success).toBe(false);
    expect(transferSchema.safeParse({ ...truck, notes: 'Quedó suelto' }).success).toBe(true);
    expect(transferSchema.safeParse({ ...truck, carId: '', notes: 'x' }).success).toBe(false);
  });
});

describe('warehouseSchema', () => {
  const w = { name: 'Norte', code: 'NORTE', kind: 'depot', address: '', isDefault: false, latitude: '', longitude: '' };
  it('acepta un galpón', () => expect(warehouseSchema.safeParse(w).success).toBe(true));
  it('el código: hasta 12 y sin espacios', () => {
    expect(warehouseSchema.safeParse({ ...w, code: 'A'.repeat(13) }).success).toBe(false);
    expect(warehouseSchema.safeParse({ ...w, code: 'a b' }).success).toBe(false);
  });
});

describe('cuerpo del galpón', () => {
  const w = {
    name: 'Norte',
    code: 'NORTE',
    kind: 'depot' as const,
    address: '',
    isDefault: false,
    latitude: '',
    longitude: '',
  };
  const current = { isDefault: false, latitude: null, longitude: null };
  it('al editar, la dirección vacía se manda como null para borrarla', () =>
    expect(warehouseUpdateBody(w, current)).toHaveProperty('address', null));
  it('al crear, la dirección vacía no se manda', () => expect(warehouseCreateBody(w).address).toBeUndefined());
  it('la marca de predeterminado sólo viaja si cambia', () => {
    expect(warehouseUpdateBody(w, current)).not.toHaveProperty('isDefault');
    expect(warehouseUpdateBody({ ...w, isDefault: true }, current)).toHaveProperty('isDefault', true);
  });
});
