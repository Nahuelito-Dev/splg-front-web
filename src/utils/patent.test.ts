import { describe, expect, it } from 'vitest';
import { normalizePatent } from './patent';

describe('normalizePatent', () => {
  it('pasa a mayúsculas y saca espacios y guiones', () => {
    expect(normalizePatent(' ab 104-ej ')).toBe('AB104EJ');
    expect(normalizePatent('AB-104-EJ')).toBe('AB104EJ');
  });

  it('deja intacta una patente ya normalizada y vacía queda vacía', () => {
    expect(normalizePatent('AB104EJ')).toBe('AB104EJ');
    expect(normalizePatent(' - ')).toBe('');
  });
});
