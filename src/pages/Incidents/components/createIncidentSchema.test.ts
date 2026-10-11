import { describe, expect, it } from 'vitest';
import { createIncidentSchema } from './createIncidentSchema';

const valid = {
  type: 'other' as const,
  description: 'El cliente no estaba en el domicilio.',
};

describe('createIncidentSchema', () => {
  it('acepta una incidencia válida sin foto', () => {
    expect(createIncidentSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['damaged', 'out_of_stock', 'no_show', 'other'])('acepta el tipo %s', (type) => {
    expect(createIncidentSchema.safeParse({ ...valid, type }).success).toBe(true);
  });

  it.each([
    ['tipo inválido', { type: 'otro-invalido' }],
    ['sin descripción', { description: '' }],
  ])('rechaza %s', (_, cambio) => {
    expect(createIncidentSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
