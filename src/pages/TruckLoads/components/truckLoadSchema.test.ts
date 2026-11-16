import { describe, expect, it } from 'vitest';
import { loadItemsSchema, openLoadSchema, reloadSchema, returnSchema } from './truckLoadSchema';

const valid = {
  deliveryId: 'd1',
  carId: 'c1',
  helperEmployeeId: '',
  originWarehouseId: '',
  notes: '',
  items: [{ gasCylinderId: 'g1', loadedFull: 10, loadedEmpty: 8 }],
};

describe('openLoadSchema', () => {
  it('acepta una carga completa', () => expect(openLoadSchema.safeParse(valid).success).toBe(true));

  it('pide chofer y camión', () => {
    const result = openLoadSchema.safeParse({ ...valid, deliveryId: '', carId: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(['Elegí el chofer', 'Elegí el camión']);
  });
});

describe('loadItemsSchema', () => {
  it('las llenas pueden ser 0 para cargar un renglón sólo de vacías', () =>
    expect(loadItemsSchema.safeParse([{ gasCylinderId: 'g1', loadedFull: 0, loadedEmpty: 3 }]).success).toBe(true));

  it('las vacías pueden ser 0', () =>
    expect(loadItemsSchema.safeParse([{ gasCylinderId: 'g1', loadedFull: 1, loadedEmpty: 0 }]).success).toBe(true));

  it('rechaza un decimal y un negativo', () => {
    expect(loadItemsSchema.safeParse([{ gasCylinderId: 'g1', loadedFull: 1.5, loadedEmpty: 0 }]).success).toBe(false);
    expect(loadItemsSchema.safeParse([{ gasCylinderId: 'g1', loadedFull: 1, loadedEmpty: -1 }]).success).toBe(false);
  });

  it('no repite el tipo de garrafa', () => {
    const result = loadItemsSchema.safeParse([
      { gasCylinderId: 'g1', loadedFull: 1, loadedEmpty: 0 },
      { gasCylinderId: 'g1', loadedFull: 2, loadedEmpty: 0 },
    ]);
    expect(result.error?.issues[0].message).toBe('Ese tipo ya está en la carga');
  });

  it('exige al menos un renglón', () => expect(loadItemsSchema.safeParse([]).success).toBe(false));

  it('respeta el tope del back por tipo', () =>
    expect(loadItemsSchema.safeParse([{ gasCylinderId: 'g1', loadedFull: 2001, loadedEmpty: 0 }]).success).toBe(false));
});

describe('reloadSchema', () => {
  it('pide cantidad positiva', () =>
    expect(reloadSchema.safeParse({ items: [{ gasCylinderId: 'g1', quantity: 0 }] }).success).toBe(false));
  it('acepta una reposición', () =>
    expect(reloadSchema.safeParse({ items: [{ gasCylinderId: 'g1', quantity: 3 }] }).success).toBe(true));
});

describe('returnSchema', () => {
  const row = { gasCylinderId: 'g', type: '10kg' };
  it('lo declarado es obligatorio: vacío no es 0', () =>
    expect(returnSchema.safeParse({ items: [{ ...row, declaredFull: '', declaredEmpty: '3' }] }).success).toBe(false));
  it('0 es un valor válido', () =>
    expect(returnSchema.safeParse({ items: [{ ...row, declaredFull: '0', declaredEmpty: '0' }] }).success).toBe(true));
  it('sólo enteros', () =>
    expect(returnSchema.safeParse({ items: [{ ...row, declaredFull: '1.5', declaredEmpty: '0' }] }).success).toBe(
      false,
    ));
});
