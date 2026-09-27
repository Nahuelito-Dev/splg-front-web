import { describe, expect, it } from 'vitest';
import { createClaimSchema } from './createClaimSchema';

const valid = {
  reason: 'Fuga de gas',
  description: 'El cliente reporta olor a gas cerca de la garrafa.',
  photoUrl: '',
};

describe('createClaimSchema', () => {
  it('acepta un reclamo válido sin foto', () => {
    expect(createClaimSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta una foto con URL válida', () => {
    const result = createClaimSchema.safeParse({ ...valid, photoUrl: 'https://cdn.splg.com/foto.jpg' });
    expect(result.success).toBe(true);
  });

  it.each([
    ['sin motivo', { reason: '' }],
    ['motivo en blanco', { reason: '   ' }],
    ['sin descripción', { description: '' }],
    ['foto que no es una URL', { photoUrl: 'no-es-una-url' }],
  ])('rechaza %s', (_, cambio) => {
    expect(createClaimSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
