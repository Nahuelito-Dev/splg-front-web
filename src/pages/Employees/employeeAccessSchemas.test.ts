import { describe, expect, it } from 'vitest';
import { grantAccountBody, grantAccountSchema, jobPositionSchema } from './employeeAccessSchemas';

const account = { email: 'ana@correo.com', password: 'Test1234', phoneNumber: '' };

describe('grantAccountSchema', () => {
  it('acepta correo, contraseña y sin teléfono', () =>
    expect(grantAccountSchema.safeParse(account).success).toBe(true));
  it('exige 6 caracteres de contraseña como Firebase', () =>
    expect(grantAccountSchema.safeParse({ ...account, password: '12345' }).success).toBe(false));
  it('rechaza un correo inválido', () =>
    expect(grantAccountSchema.safeParse({ ...account, email: 'ana' }).success).toBe(false));
  it('el teléfono tiene que ser E.164', () => {
    expect(grantAccountSchema.safeParse({ ...account, phoneNumber: '3764000000' }).success).toBe(false);
    expect(grantAccountSchema.safeParse({ ...account, phoneNumber: '+5493764000000' }).success).toBe(true);
  });
  it('sin teléfono no lo manda (el back usa el del legajo)', () =>
    expect(grantAccountBody(account)).toEqual({ email: 'ana@correo.com', password: 'Test1234' }));
});

describe('jobPositionSchema', () => {
  const base = { name: 'Chofer de reparto', category: 'driver' as const, isActive: true };
  it('acepta un puesto válido', () => expect(jobPositionSchema.safeParse(base).success).toBe(true));
  it('el nombre va de 2 a 80 caracteres', () => {
    expect(jobPositionSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
    expect(jobPositionSchema.safeParse({ ...base, name: 'x'.repeat(81) }).success).toBe(false);
  });
  it('exige una categoría del catálogo', () =>
    expect(jobPositionSchema.safeParse({ ...base, category: 'otra' }).success).toBe(false));
});
