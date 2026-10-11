import { describe, expect, it } from 'vitest';
import { createClaimSchema } from './createClaimSchema';

const valid = {
  reason: 'Fuga de gas',
  description: 'El cliente reporta olor a gas cerca de la garrafa.',
};

describe('createClaimSchema', () => {
  it('acepta un reclamo válido sin foto', () => {
    expect(createClaimSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['sin motivo', { reason: '' }],
    ['motivo en blanco', { reason: '   ' }],
    ['sin descripción', { description: '' }],
  ])('rechaza %s', (_, cambio) => {
    expect(createClaimSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
