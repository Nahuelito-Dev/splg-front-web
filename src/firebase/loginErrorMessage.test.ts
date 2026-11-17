import { describe, expect, it } from 'vitest';
import { loginErrorMessage } from './providers';

describe('loginErrorMessage', () => {
  it('credenciales incorrectas: un texto claro, nunca el mensaje técnico de Firebase', () => {
    for (const code of [
      'auth/invalid-login-credentials',
      'auth/invalid-credential',
      'auth/wrong-password',
      'auth/user-not-found',
    ]) {
      expect(loginErrorMessage(code)).toBe('El email o la contraseña no son correctos.');
    }
  });

  it('cuenta desactivada, demasiados intentos y sin conexión tienen su propio texto', () => {
    expect(loginErrorMessage('auth/user-disabled')).toMatch(/desactivada/);
    expect(loginErrorMessage('auth/too-many-requests')).toMatch(/demasiados intentos/);
    expect(loginErrorMessage('auth/network-request-failed')).toMatch(/conexión/);
  });

  it('cualquier otro error sale genérico y en castellano', () => {
    expect(loginErrorMessage('auth/internal-error')).toBe('No se pudo iniciar sesión. Probá de nuevo en un rato.');
    expect(loginErrorMessage(undefined)).not.toMatch(/Firebase/);
  });
});
