import { describe, expect, it } from 'vitest';
import type { StockBalance, StockMovement, StockThreshold } from '../../services/api/types';
import {
  adjustmentCondition,
  adjustmentDelta,
  changedThresholds,
  groupByBatch,
  lowStock,
  pivotBalances,
  pivotByLocation,
} from './stockMath';

const bal = (patch: Partial<StockBalance>): StockBalance => ({
  locationId: 'l1',
  locationName: 'Central',
  locationKind: 'warehouse',
  warehouseId: 'w1',
  carId: null,
  gasCylinderId: 'g1',
  gasCylinderType: '10kg',
  condition: 'full',
  quantity: 1,
  updatedAt: '',
  ...patch,
});

describe('adjustmentDelta', () => {
  it.each(['shrinkage', 'leak', 'damaged', 'lost'] as const)(
    '%s siempre resta, aunque se escriba negativo',
    (reason) => {
      expect(adjustmentDelta(reason, 3)).toBe(-3);
      expect(adjustmentDelta(reason, -3)).toBe(-3);
    },
  );
  it('lo encontrado siempre suma', () => {
    expect(adjustmentDelta('found', 2)).toBe(2);
    expect(adjustmentDelta('found', -2)).toBe(2);
  });
  it('la corrección de conteo respeta el signo', () => {
    expect(adjustmentDelta('count_correction', -4)).toBe(-4);
    expect(adjustmentDelta('count_correction', 4)).toBe(4);
  });
});

describe('adjustmentCondition', () => {
  it('la rotura es siempre sobre llenas', () => expect(adjustmentCondition('damaged', 'empty')).toBe('full'));
  it('el resto respeta la elegida', () => expect(adjustmentCondition('lost', 'empty')).toBe('empty'));
});

describe('pivot', () => {
  it('junta las condiciones de una garrafa', () => {
    const rows = pivotBalances([
      bal({ quantity: 5 }),
      bal({ condition: 'empty', quantity: 2 }),
      bal({ condition: 'defective', quantity: 1 }),
    ]);
    expect(rows).toEqual([{ gasCylinderId: 'g1', gasCylinderType: '10kg', full: 5, empty: 2, defective: 1 }]);
  });
  it('separa por ubicación y deja los galpones antes que los camiones', () => {
    const rows = pivotByLocation([
      bal({ locationId: 'v', locationName: 'AF123', locationKind: 'vehicle' }),
      bal({ locationId: 'l1' }),
    ]);
    expect(rows.map((r) => r.locationKind)).toEqual(['vehicle', 'warehouse'].sort());
    expect(rows).toHaveLength(2);
  });
});

describe('lowStock', () => {
  const t = (minFull: number, currentFull: number) => ({ minFull, currentFull }) as StockThreshold;
  it('avisa sólo con mínimo y por debajo', () => {
    expect(lowStock([t(10, 9), t(10, 10), t(0, 0), t(5, 20)])).toHaveLength(1);
  });
});

describe('changedThresholds', () => {
  const current = new Map([['w:g', { minFull: 10 }]]);
  it('manda sólo lo que cambió', () => {
    expect(changedThresholds({ 'w:g': '12', 'w:h': '0' }, current)).toEqual([
      { warehouseId: 'w', gasCylinderId: 'g', minFull: 12 },
    ]);
  });
  it('vaciar un mínimo existente lo pone en 0 (desactiva el aviso)', () => {
    expect(changedThresholds({ 'w:g': '' }, current)).toEqual([{ warehouseId: 'w', gasCylinderId: 'g', minFull: 0 }]);
  });
  it('ignora lo inválido', () => {
    expect(changedThresholds({ 'w:g': '-1', 'w:x': '2.5' }, current)).toEqual([]);
  });
});

describe('groupByBatch', () => {
  const m = (movementId: string, batchId: string) =>
    ({ movementId, batchId, occurredAt: '', actorName: null, notes: null }) as StockMovement;
  it('junta los renglones de un lote y respeta el orden', () => {
    const batches = groupByBatch([m('1', 'A'), m('2', 'B'), m('3', 'A')]);
    expect(batches.map((b) => [b.batchId, b.lines.length])).toEqual([
      ['A', 2],
      ['B', 1],
    ]);
  });
});
