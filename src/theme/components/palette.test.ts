import { describe, expect, it } from 'vitest';
import { SHADOW_DIALOG, surfaceTokens, withAlpha } from './palette';

describe('palette de los overrides', () => {
  it('deriva el rgba de un token de la marca', () => {
    expect(withAlpha('#0B1220', 0.5)).toBe('rgba(11, 18, 32, 0.5)');
  });

  it('las sombras y el fondo salen de tokens (no hay canales sueltos)', () => {
    expect(SHADOW_DIALOG).toContain('rgba(11, 18, 32, 0.28)');
    expect(surfaceTokens('light').backdrop).toBe('rgba(11, 18, 32, 0.42)');
    expect(surfaceTokens('dark').backdrop).toBe('rgba(11, 15, 22, 0.72)');
  });
});
