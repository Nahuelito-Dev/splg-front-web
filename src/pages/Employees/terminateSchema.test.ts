import { describe, expect, it } from 'vitest';
import { terminateSchema } from './terminateSchema';

describe('terminateSchema', () => {
  const schema = terminateSchema('2026-03-01');

  it('el egreso no puede ser anterior al ingreso', () => {
    expect(schema.safeParse({ terminationDate: '2026-02-28', reason: 'resignation' }).success).toBe(false);
    expect(schema.safeParse({ terminationDate: '2026-03-01', reason: 'resignation' }).success).toBe(true);
    expect(schema.safeParse({ terminationDate: '2026-09-01', reason: 'other' }).success).toBe(true);
  });

  it('la fecha es obligatoria', () => {
    expect(schema.safeParse({ terminationDate: '', reason: 'other' }).success).toBe(false);
  });
});
