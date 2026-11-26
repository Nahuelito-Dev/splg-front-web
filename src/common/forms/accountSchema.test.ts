import { describe, expect, it } from 'vitest';
import { newAccountSchema } from './accountSchema';

const valid = {
  full_name: 'Ana Pérez',
  phone_number: '+5493764000000',
  email: 'ana@example.com',
  password: 'Secreta-2026x',
  confirmPassword: 'Secreta-2026x',
};

describe('newAccountSchema (mismas reglas que la API)', () => {
  it('acepta una cuenta válida', () => {
    expect(newAccountSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta espacios y cualquier carácter', () => {
    const password = 'Mi clave ñ#9 ok';
    expect(newAccountSchema.safeParse({ ...valid, password, confirmPassword: password }).success).toBe(true);
  });

  it.each([
    ['teléfono sin formato E.164', { phone_number: '3764000000' }],
    ['nombre de una letra', { full_name: 'A' }],
    ['contraseña corta', { password: 'Abcde12', confirmPassword: 'Abcde12' }],
    ['contraseña sin mayúscula', { password: 'abcdef12', confirmPassword: 'abcdef12' }],
    ['contraseña sin minúscula', { password: 'ABCDEF12', confirmPassword: 'ABCDEF12' }],
    ['contraseña sin número', { password: 'Abcdefgh', confirmPassword: 'Abcdefgh' }],
    ['contraseña común', { password: 'Test1234', confirmPassword: 'Test1234' }],
    ['contraseña de más de 128', { password: `A1${'x'.repeat(127)}`, confirmPassword: `A1${'x'.repeat(127)}` }],
    ['contraseñas distintas', { confirmPassword: 'otra123' }],
    ['email inválido', { email: 'ana' }],
  ])('rechaza %s', (_, cambio) => {
    expect(newAccountSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
