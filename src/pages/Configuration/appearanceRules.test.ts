import { describe, expect, it } from 'vitest';
import type { CompanyTheme } from '../../services/api/types';
import { appearanceSchema, contrastOf, pairLabel, ratioLabel, toThemeBody, valuesOf } from './appearanceRules';

const base = { primaryColor: '#1d4ed8', customAccent: false, accentColor: '', displayName: '' };

describe('appearanceRules', () => {
  it('acepta un color #RRGGBB y rechaza otros formatos', () => {
    expect(appearanceSchema.safeParse(base).success).toBe(true);
    for (const primaryColor of ['#FFF', 'azul', '#12345G', '']) {
      expect(appearanceSchema.safeParse({ ...base, primaryColor }).success).toBe(false);
    }
  });

  it('el acento sólo se valida si se elige', () => {
    expect(appearanceSchema.safeParse({ ...base, accentColor: 'x' }).success).toBe(true);
    expect(appearanceSchema.safeParse({ ...base, customAccent: true, accentColor: 'x' }).success).toBe(false);
    expect(appearanceSchema.safeParse({ ...base, customAccent: true, accentColor: '#B27A00' }).success).toBe(true);
  });

  it('el nombre es opcional o de 2 a 60 caracteres', () => {
    expect(appearanceSchema.safeParse({ ...base, displayName: 'N' }).success).toBe(false);
    expect(appearanceSchema.safeParse({ ...base, displayName: 'x'.repeat(61) }).success).toBe(false);
    expect(appearanceSchema.safeParse({ ...base, displayName: 'Nahuel Gas' }).success).toBe(true);
    expect(appearanceSchema.safeParse({ ...base, displayName: '<b>Gas</b>' }).success).toBe(false);
  });

  it('arma el cuerpo: mayúsculas, sin acento si se deriva, sin nombre si está vacío', () => {
    expect(toThemeBody(base)).toEqual({ primaryColor: '#1D4ED8', accentColor: null, displayName: null });
    expect(
      toThemeBody({ ...base, customAccent: true, accentColor: '#b27a00', displayName: '  Nahuel   Gas ' }),
    ).toEqual({
      primaryColor: '#1D4ED8',
      accentColor: '#B27A00',
      displayName: 'Nahuel Gas',
    });
  });

  it('valores iniciales desde el tema de la API', () => {
    const theme = {
      primaryColor: '#1D4ED8',
      accentColor: null,
      displayName: null,
      tokens: { light: { accent: '#956CD7' } },
    } as unknown as CompanyTheme;
    expect(valuesOf(theme)).toEqual({
      primaryColor: '#1D4ED8',
      customAccent: false,
      accentColor: '#956CD7',
      displayName: '',
    });
  });

  it('etiquetas de contraste', () => {
    expect(pairLabel('onPrimary/primary')).toBe('Texto de los botones sobre el color principal');
    expect(pairLabel('otro/par')).toBe('otro/par');
    expect(ratioLabel(4.5)).toBe('4,5:1');
    const items = [
      { pair: 'a', mode: 'light' as const, ratio: 1, required: 3, ok: false },
      { pair: 'b', mode: 'dark' as const, ratio: 5, required: 3, ok: true },
    ];
    expect(contrastOf(items, 'dark').map((i) => i.pair)).toEqual(['b']);
  });
});
