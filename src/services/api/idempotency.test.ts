import { describe, expect, it } from 'vitest';
import { clearIntent, intentKey } from './idempotency';

describe('intentKey', () => {
  it('reabrir el formulario con los mismos datos reusa la clave (aunque cambie el orden de los campos)', () => {
    const a = intentKey('t:new', { a: 1, items: [{ x: 1, y: 2 }] });
    expect(intentKey('t:new', { items: [{ y: 2, x: 1 }], a: 1 })).toBe(a);
    clearIntent('t:new');
  });

  it('si cambian los datos es otra intención y otra clave', () => {
    const a = intentKey('t:cambia', { qty: 1 });
    expect(intentKey('t:cambia', { qty: 2 })).not.toBe(a);
    clearIntent('t:cambia');
  });

  it('tras terminar la intención, la siguiente (aun con los mismos datos) lleva otra clave', () => {
    const a = intentKey('t:fin', { qty: 1 });
    clearIntent('t:fin');
    expect(intentKey('t:fin', { qty: 1 })).not.toBe(a);
    clearIntent('t:fin');
  });

  it('cada operación y entidad tiene su propia clave', () => {
    expect(intentKey('close:1', {})).not.toBe(intentKey('close:2', {}));
    clearIntent('close:1');
    clearIntent('close:2');
  });
});
