import { describe, expect, it } from 'vitest';
import { buildQuoteBody, quoteHint } from './orderQuote';

const base = {
  customerId: 'c1',
  addressId: 'a1',
  paymentMethod: 'transfer' as const,
  deliveryMode: 'express' as const,
  items: [{ gasCylinderId: 'g1', quantity: 2, unitPrice: 9500 }],
};

describe('buildQuoteBody', () => {
  it('arma el cuerpo con los números ya convertidos', () => {
    const body = buildQuoteBody({
      ...base,
      items: [{ gasCylinderId: 'g1', quantity: '2' as unknown as number, unitPrice: 9500 }],
    });
    expect(body).toEqual(base);
  });

  it('no cotiza sin cliente, dirección o ítems', () => {
    expect(buildQuoteBody({ ...base, customerId: '' })).toBeNull();
    expect(buildQuoteBody({ ...base, addressId: '' })).toBeNull();
    expect(buildQuoteBody({ ...base, items: [] })).toBeNull();
  });

  it('no cotiza con un renglón incompleto o inválido', () => {
    expect(buildQuoteBody({ ...base, items: [{ gasCylinderId: '', quantity: 1, unitPrice: 10 }] })).toBeNull();
    expect(buildQuoteBody({ ...base, items: [{ gasCylinderId: 'g1', quantity: 0, unitPrice: 10 }] })).toBeNull();
    expect(buildQuoteBody({ ...base, items: [{ gasCylinderId: 'g1', quantity: 1.5, unitPrice: 10 }] })).toBeNull();
  });

  it('la modalidad por omisión es la programada', () => {
    expect(buildQuoteBody({ ...base, deliveryMode: undefined })?.deliveryMode).toBe('standard');
  });

  it('el precio unitario no decide si se cotiza', () => {
    expect(buildQuoteBody({ ...base, items: [{ gasCylinderId: 'g1', quantity: 1, unitPrice: -1 }] })).not.toBeNull();
  });

  it('dice qué falta, y distingue un ítem inválido de la falta de ítems', () => {
    expect(quoteHint({ ...base, customerId: '' })).toMatch(/cliente/);
    expect(quoteHint({ ...base, addressId: '' })).toMatch(/dirección/);
    expect(quoteHint({ ...base, items: [] })).toMatch(/Agregá al menos un ítem/);
    expect(quoteHint({ ...base, items: [{ gasCylinderId: '', quantity: 1, unitPrice: 0 }] })).toMatch(/Completá/);
    expect(quoteHint(base)).toBeNull();
  });
});
