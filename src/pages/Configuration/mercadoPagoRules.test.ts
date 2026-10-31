import { describe, expect, it } from 'vitest';
import { emptyMercadoPagoValues, mercadoPagoSchema, SECRET_MAX, toMercadoPagoBody } from './mercadoPagoRules';

const valid = { accessToken: 'APP_USR-123', publicKey: 'APP_USR-abc', webhookSecret: 'secreto' };

describe('mercadoPagoSchema', () => {
  it('acepta los tres datos cargados', () => {
    expect(mercadoPagoSchema.safeParse(valid).success).toBe(true);
  });

  it('pide cada dato: vacío o sólo espacios no pasa', () => {
    expect(mercadoPagoSchema.safeParse(emptyMercadoPagoValues).success).toBe(false);
    const result = mercadoPagoSchema.safeParse({ ...valid, publicKey: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Cargá la clave pública');
  });

  it('respeta el tope del back', () => {
    expect(mercadoPagoSchema.safeParse({ ...valid, accessToken: 'a'.repeat(SECRET_MAX + 1) }).success).toBe(false);
    expect(mercadoPagoSchema.safeParse({ ...valid, accessToken: 'a'.repeat(SECRET_MAX) }).success).toBe(true);
  });
});

describe('toMercadoPagoBody', () => {
  it('recorta los espacios', () => {
    expect(toMercadoPagoBody({ accessToken: ' t ', publicKey: ' p ', webhookSecret: ' s ' })).toEqual({
      accessToken: 't',
      publicKey: 'p',
      webhookSecret: 's',
    });
  });
});
