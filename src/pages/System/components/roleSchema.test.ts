import { describe, expect, it } from 'vitest';
import { roleSchema } from './roleSchema';

describe('roleSchema', () => {
  it('acepta un nombre válido', () => {
    expect(roleSchema.safeParse({ type: 'qa_pruebas' }).success).toBe(true);
  });

  it.each([
    ['vacío', ''],
    ['de un solo caracter', 'a'],
    ['con mayúsculas', 'QA'],
    ['con espacios', 'qa pruebas'],
    ['con números', 'qa2'],
  ])('rechaza %s', (_, type) => {
    expect(roleSchema.safeParse({ type }).success).toBe(false);
  });
});
