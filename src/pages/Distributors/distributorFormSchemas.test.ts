import { describe, expect, it } from 'vitest';
import { distributorCreateSchema } from './distributorFormSchemas';

const valid = { name: 'Prueba empresa', slug: 'prueba-empresa', legal_name: '', tax_id: '', email: '', phone: '' };

describe('distributorCreateSchema: CUIT', () => {
  it('acepta vacío y 11 dígitos con o sin guiones, como el back', () => {
    expect(distributorCreateSchema.safeParse(valid).success).toBe(true);
    expect(distributorCreateSchema.safeParse({ ...valid, tax_id: '30-12345678-9' }).success).toBe(true);
    expect(distributorCreateSchema.safeParse({ ...valid, tax_id: '30123456789' }).success).toBe(true);
  });

  it('rechaza un CUIT que no tiene 11 dígitos', () => {
    const result = distributorCreateSchema.safeParse({ ...valid, tax_id: '30-1234-9' });
    expect(result.success).toBe(false);
    expect(result.success ? '' : result.error.issues[0]?.message).toBe('El CUIT tiene que tener 11 dígitos');
  });
});
