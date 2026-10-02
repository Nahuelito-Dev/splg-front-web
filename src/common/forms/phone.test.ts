import { describe, expect, it } from 'vitest';
import { isE164, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('saca espacios, guiones y paréntesis', () => {
    expect(normalizePhone(' +54 9 (376) 400-0000 ')).toBe('+5493764000000');
  });

  it('pasa el prefijo 00 a +', () => {
    expect(normalizePhone('005493764000000')).toBe('+5493764000000');
  });
});

describe('isE164', () => {
  it('acepta el formato internacional y rechaza el resto', () => {
    expect(isE164('+5493764000000')).toBe(true);
    expect(isE164('3764000000')).toBe(false);
    expect(isE164('+0123')).toBe(false);
  });
});
