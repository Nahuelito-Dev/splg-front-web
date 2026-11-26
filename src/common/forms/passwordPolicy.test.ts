import { describe, expect, it } from 'vitest';
import { isCommonPassword } from './passwordPolicy';

describe('isCommonPassword', () => {
  it('reconoce una contraseña común aunque venga con espacios, mayúsculas o caracteres de ancho completo', () => {
    expect(isCommonPassword('Password123 ')).toBe(true);
    expect(isCommonPassword(' Pass word123')).toBe(true);
    expect(isCommonPassword('Ｐａｓｓｗｏｒｄ１２３')).toBe(true);
  });

  it('una contraseña propia no es común', () => {
    expect(isCommonPassword('Garrafa-Azul-2026')).toBe(false);
  });
});
