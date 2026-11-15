import brand from './brand.json';
import { describe, expect, it } from 'vitest';
import { colorOnDarkSurface, contrast } from './colorContrast';
import { THEME_PRESETS } from './themePresets';

describe('acento del menú lateral', () => {
  it('conserva contraste de texto para Brasa y las siete paletas', () => {
    const colors = [brand.llama['600'], ...THEME_PRESETS.map((preset) => preset.primaryColor)];
    for (const color of colors) {
      const sideAccent = colorOnDarkSurface(color, brand.sidebar.bg, 4.5);
      expect(contrast(sideAccent, brand.sidebar.bg), color).toBeGreaterThanOrEqual(4.5);
    }
  });
});
