import { describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api/httpClient', () => ({ http }));

import { getCompanyTheme, previewCompanyTheme, putCompanyTheme } from '../services/api/companyTheme';
import type { CompanyTheme } from '../services/api/types';
import { companyThemeCss } from './companyTheme';
import { createAppTheme } from './muiTheme';
import { BRASA_TOKENS, isHexToken, sanitizeTokens } from './themeTokens';

const MALICIOSO = '#000;background:url(x)';

const modo = (primary: string) => ({
  primary,
  primaryHover: '#103DC7',
  primaryStrong: '#0832BC',
  primarySoft: '#F0F5FF',
  onPrimary: '#FFFFFF',
  accent: '#956CD7',
  accentSoft: '#F6F3FF',
  gradientFrom: primary,
  gradientTo: '#0D39C3',
  gradientEdge: '#052AB6',
});

const respuesta = (): CompanyTheme =>
  ({
    primaryColor: '#1D4ED8',
    isDefault: false,
    tokens: { light: modo(MALICIOSO), dark: { ...modo('#265AE4'), onPrimary: 'url(x)', accent: 42 } },
  }) as unknown as CompanyTheme;

describe('tokens del tema: se validan al recibirlos', () => {
  it('isHexToken sólo acepta #RRGGBB', () => {
    expect(isHexToken('#1D4ED8')).toBe(true);
    for (const v of [MALICIOSO, '#FFF', 'red', 42, null, undefined, '#1D4ED8 ']) expect(isHexToken(v)).toBe(false);
  });

  it('un token inválido toma el de Brasa; los válidos quedan', () => {
    const t = sanitizeTokens(respuesta().tokens);
    expect(t.light.primary).toBe(BRASA_TOKENS.light.primary);
    expect(t.light.gradientFrom).toBe(BRASA_TOKENS.light.gradientFrom);
    expect(t.light.primaryHover).toBe('#103DC7');
    expect(t.dark.onPrimary).toBe(BRASA_TOKENS.dark.onPrimary);
    expect(t.dark.accent).toBe(BRASA_TOKENS.dark.accent);
    expect(t.dark.primary).toBe('#265AE4');
  });

  it('sin tokens o con basura entera, Brasa completo', () => {
    expect(sanitizeTokens(undefined)).toEqual(BRASA_TOKENS);
    expect(sanitizeTokens({ light: 'x', dark: [] })).toEqual(BRASA_TOKENS);
  });

  it.each([
    ['GET', () => getCompanyTheme(), http.get],
    ['preview', () => previewCompanyTheme({ primaryColor: '#1D4ED8' }), http.post],
    ['PUT', () => putCompanyTheme({ primaryColor: '#1D4ED8' }), http.put],
  ])(
    '%s devuelve los tokens ya validados: el malicioso no llega a la hoja, a MUI ni al degradé',
    async (_n, call, fn) => {
      fn.mockResolvedValue({ data: respuesta() });
      const theme = await call();
      const serializado = JSON.stringify(theme.tokens);
      expect(serializado).not.toContain('url(');
      expect(serializado).not.toContain(';');
      expect(companyThemeCss(theme.tokens)).not.toContain('url(');
      expect(createAppTheme('light', theme.tokens).palette.primary.main).toBe(BRASA_TOKENS.light.primary);
      expect(createAppTheme('dark', theme.tokens).palette.primary.contrastText).toBe(BRASA_TOKENS.dark.onPrimary);
    },
  );
});
