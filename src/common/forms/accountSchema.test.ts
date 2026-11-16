import { describe, expect, it } from 'vitest';
import { newAccountSchema } from './accountSchema';

const valid = {
  full_name: 'Ana Pérez',
  phone_number: '+5493764000000',
  email: 'ana@example.com',
  password: 'secreta1',
  confirmPassword: 'secreta1',
};

describe('newAccountSchema (mismas reglas que la API)', () => {
  it('acepta una cuenta válida', () => {
    expect(newAccountSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['teléfono sin formato E.164', { phone_number: '3764000000' }],
    ['nombre de una letra', { full_name: 'A' }],
    ['contraseña corta', { password: '12345', confirmPassword: '12345' }],
    ['contraseñas distintas', { confirmPassword: 'otra123' }],
    ['email inválido', { email: 'ana' }],
  ])('rechaza %s', (_, cambio) => {
    expect(newAccountSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
