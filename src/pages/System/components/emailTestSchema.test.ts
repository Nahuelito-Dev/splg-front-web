import { describe, expect, it } from 'vitest';
import { emailTestSchema } from './emailTestSchema';

describe('emailTestSchema', () => {
  it('acepta un correo válido', () => {
    expect(emailTestSchema.safeParse({ email: 'admin@splg.com' }).success).toBe(true);
  });

  it.each([
    ['vacío', ''],
    ['sin arroba', 'no-es-un-correo'],
    ['sólo espacios', '   '],
  ])('rechaza un correo %s', (_, email) => {
    expect(emailTestSchema.safeParse({ email }).success).toBe(false);
  });
});
