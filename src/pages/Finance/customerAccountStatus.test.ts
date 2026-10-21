import { describe, expect, it } from 'vitest';
import { accountStatusError, accountStatusOptions, canChangeAccountStatus } from './customerAccountStatus';

describe('estados de la cuenta corriente', () => {
  it('una cuenta cerrada sólo vuelve a activa', () => {
    expect(canChangeAccountStatus('closed', 'active')).toBe(true);
    expect(canChangeAccountStatus('closed', 'blocked')).toBe(false);
    expect(accountStatusOptions('closed').map((o) => o.value)).toEqual(['active', 'closed']);
    expect(accountStatusError('closed', 'blocked')).toMatch(/sólo puede volver a activa/);
  });

  it('activa y bloqueada pueden pasar entre sí y cerrarse', () => {
    expect(canChangeAccountStatus('active', 'blocked')).toBe(true);
    expect(canChangeAccountStatus('blocked', 'active')).toBe(true);
    expect(canChangeAccountStatus('blocked', 'closed')).toBe(true);
    expect(accountStatusOptions('active').map((o) => o.value)).toEqual(['active', 'blocked', 'closed']);
  });

  it('repetir el estado no es un cambio', () => {
    expect(accountStatusError('closed', 'closed')).toBeUndefined();
  });
});
