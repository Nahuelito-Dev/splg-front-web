import { describe, expect, it } from 'vitest';
import type { StockBalance } from '../../services/api/types';
import { findShortfalls } from './stockAvailability';

const balance = (gasCylinderId: string, condition: StockBalance['condition'], quantity: number) =>
  ({ gasCylinderId, gasCylinderType: '10 kg', condition, quantity }) as StockBalance;

const balances = [balance('g1', 'full', 10), balance('g1', 'empty', 3)];

describe('stock disponible', () => {
  it('avisa si se saca más de lo que hay', () => {
    const result = findShortfalls(balances, [{ gasCylinderId: 'g1', condition: 'full', delta: -11 }]);
    expect(result.get(0)).toBe('Hay 10 llenas de 10 kg: no se pueden sacar 11');
  });

  it('sacar justo lo que hay y sumar no avisan', () => {
    expect(findShortfalls(balances, [{ gasCylinderId: 'g1', condition: 'full', delta: -10 }]).size).toBe(0);
    expect(findShortfalls(balances, [{ gasCylinderId: 'g1', condition: 'empty', delta: 50 }]).size).toBe(0);
  });

  it('suma los renglones de la misma garrafa y condición', () => {
    const result = findShortfalls(balances, [
      { gasCylinderId: 'g1', condition: 'full', delta: -6 },
      { gasCylinderId: 'g1', condition: 'full', delta: -6 },
    ]);
    expect([...result.keys()]).toEqual([1]);
  });

  it('una garrafa sin saldo cuenta como cero', () => {
    const result = findShortfalls(balances, [{ gasCylinderId: 'g2', condition: 'defective', delta: -1 }]);
    expect(result.get(0)).toMatch(/Hay 0 defectuosas/);
  });
});
