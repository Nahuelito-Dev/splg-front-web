import { describe, expect, it } from 'vitest';
import { parseStep, resolveSchema, toResolveBody } from './recoveryRules';

describe('resolveSchema', () => {
  it('pide la decisión y la nota', () => {
    const r = resolveSchema.safeParse({ decision: undefined, note: '' });
    expect(r.success).toBe(false);
    const campos = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(['decision', 'note']));
  });

  it('una nota de menos de 10 caracteres no vale; de 10 sí', () => {
    expect(resolveSchema.safeParse({ decision: 'write_off', note: 'corta' }).success).toBe(false);
    expect(resolveSchema.safeParse({ decision: 'write_off', note: 'x'.repeat(10) }).success).toBe(true);
  });

  it('una nota en blanco no vale', () => {
    expect(resolveSchema.safeParse({ decision: 'write_off', note: '   ' }).success).toBe(false);
  });

  it('acepta las tres decisiones con nota', () => {
    for (const decision of ['charge_deposit', 'write_off', 'close_no_charge']) {
      expect(resolveSchema.safeParse({ decision, note: 'motivo válido' }).success).toBe(true);
    }
  });

  it('rechaza una decisión desconocida y una nota de más de 500 caracteres', () => {
    expect(resolveSchema.safeParse({ decision: 'cobrar', note: 'x' }).success).toBe(false);
    expect(resolveSchema.safeParse({ decision: 'write_off', note: 'x'.repeat(501) }).success).toBe(false);
  });

  it('el cuerpo lleva la nota recortada', () => {
    expect(toResolveBody({ decision: 'charge_deposit', note: '  Se cobra con el pedido  ' })).toEqual({
      decision: 'charge_deposit',
      note: 'Se cobra con el pedido',
    });
  });
});

describe('parseStep', () => {
  it('sólo acepta los escalones 1 a 3', () => {
    expect(parseStep('2')).toBe(2);
    expect(parseStep('')).toBeUndefined();
    expect(parseStep('0')).toBeUndefined();
    expect(parseStep('4')).toBeUndefined();
    expect(parseStep('1.5')).toBeUndefined();
    expect(parseStep('abc')).toBeUndefined();
  });
});
