import { describe, expect, it } from 'vitest';
import type { TruckLoad, TruckLoadItem, TruckStock } from '../../services/api/types';
import { closeDifference, declarationRows, hasDeclared, hasDifference, loadActions, signed } from './truckLoadRules';

const item = (patch: Partial<TruckLoadItem> = {}): TruckLoadItem => ({
  itemId: 'i1',
  gasCylinderId: 'g1',
  gasCylinderType: '10kg',
  loadedFull: 10,
  reloadedFull: 0,
  loadedEmpty: 8,
  deliveredFull: 6,
  collectedEmpty: 6,
  expectedFull: 4,
  expectedEmpty: 14,
  declaredReturnFull: null,
  declaredReturnEmpty: null,
  differenceFull: null,
  differenceEmpty: null,
  onTruckFull: 4,
  onTruckEmpty: 14,
  ...patch,
});

describe('loadActions', () => {
  const only = (status: TruckLoad['status']) =>
    Object.entries(loadActions(status))
      .filter(([, allowed]) => allowed)
      .map(([name]) => name);

  it('cargando: edita renglones, sale o cancela', () =>
    expect(only('loading')).toEqual(['canEditItems', 'canDepart', 'canCancel', 'isOpen']));

  it('en ruta: repone o declara la vuelta, pero no cancela ni edita', () =>
    expect(only('on_route')).toEqual(['canReload', 'canDeclareReturn', 'isOpen']));

  it('volvió: puede volver a declarar o rendir', () =>
    expect(only('returned')).toEqual(['canDeclareReturn', 'canClose', 'isOpen']));

  it.each(['closed', 'closed_with_difference', 'cancelled'] as const)('%s: no admite acciones', (status) =>
    expect(only(status)).toEqual([]),
  );
});

describe('hasDifference', () => {
  it('sin declaración no hay diferencia', () => expect(hasDifference([item()])).toBe(false));
  it('cero en todo: sin diferencia', () =>
    expect(hasDifference([item({ differenceFull: 0, differenceEmpty: 0 })])).toBe(false));
  it('una diferencia en llenas alcanza', () =>
    expect(hasDifference([item({ differenceFull: -1, differenceEmpty: 0 })])).toBe(true));
  it('una diferencia en vacías alcanza', () =>
    expect(hasDifference([item({ differenceFull: 0, differenceEmpty: 2 })])).toBe(true));
  it('mira todos los renglones', () =>
    expect(hasDifference([item(), item({ differenceFull: 0, differenceEmpty: -3 })])).toBe(true));
});

describe('declaración', () => {
  it('se carga vacía: hay que contar, lo esperado es sólo referencia', () =>
    expect(declarationRows([item()])).toEqual([
      { gasCylinderId: 'g1', type: '10kg', declaredFull: '', declaredEmpty: '' },
    ]));

  it('al corregir se ve lo ya declarado', () =>
    expect(declarationRows([item({ declaredReturnFull: 3, declaredReturnEmpty: 0 })])[0]).toMatchObject({
      declaredFull: '3',
      declaredEmpty: '0',
    }));

  it('declarado exige todos los renglones', () => {
    expect(hasDeclared([item({ declaredReturnFull: 3, declaredReturnEmpty: 13 })])).toBe(true);
    expect(hasDeclared([item({ declaredReturnFull: 3, declaredReturnEmpty: null })])).toBe(false);
    expect(hasDeclared([])).toBe(false);
  });
});

describe('closeDifference (mismo criterio que planDeCierre del back)', () => {
  const declared = (patch: Partial<TruckLoadItem> = {}) =>
    item({ declaredReturnFull: 4, declaredReturnEmpty: 14, differenceFull: 0, differenceEmpty: 0, ...patch });
  const truck = (items: TruckStock['items']) => ({ carId: 'c', carPatent: 'AF', openLoadId: 'l', items }) as TruckStock;

  it('sin diferencia: declarado = esperado = saldo real', () =>
    expect(closeDifference([declared()], truck([])).reasons).toEqual([]));

  it('diferencia declarado vs esperado', () =>
    expect(closeDifference([declared({ differenceFull: -1 })], truck([])).reasons[0]).toContain(
      'no coincide con lo esperado',
    ));

  it('saldo real distinto de lo declarado aunque lo esperado coincida (alguien movió el camión a mano)', () => {
    const { reasons } = closeDifference([declared({ onTruckFull: 6 })], truck([]));
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('el camión tiene 6 llenas');
  });

  it('un tipo que el camión tiene y la carga no lista cuenta como diferencia; las defectuosas no', () => {
    const extra = { gasCylinderId: 'zz', gasCylinderType: '25kg', full: 2, empty: 0, defective: 0 };
    expect(closeDifference([declared()], truck([extra])).reasons[0]).toContain('25kg');
    expect(closeDifference([declared()], truck([{ ...extra, full: 0, defective: 3 }])).reasons).toEqual([]);
  });

  it('sin el saldo real no se sabe: queda marcado como desconocido', () => {
    const r = closeDifference([declared()], null);
    expect(r.unknown).toBe(true);
    expect(r.reasons).toEqual([]);
  });
});

describe('signed', () => {
  it.each([
    [3, '+3'],
    [-2, '−2'],
    [0, '0'],
    [null, '—'],
  ])('%s -> %s', (value, text) => expect(signed(value)).toBe(text));
});
