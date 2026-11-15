import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api/httpClient', () => ({ http }));

import { getCompanyTheme, previewCompanyTheme, putCompanyTheme } from '../services/api/companyTheme';
import type { CompanyTheme } from '../services/api/types';
import { companyThemeCss } from './companyTheme';
import brand from './brand.json';
import { contrast } from './colorContrast';
import { createAppTheme } from './muiTheme';
import { BRASA_TOKENS, isHexToken, sanitizeTokens } from './themeTokens';

/** `b` al `alpha` sobre `a`, como compone el navegador. */
const mix = (a: string, b: string, alpha: number): string =>
  `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - alpha) + parseInt(b.slice(i, i + 2), 16) * alpha)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

const MALICIOSO = '#000;background:url(x)';

const modo = (primary: string) => ({
  ...BRASA_TOKENS.light,
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

  it('un tema de antes, sin menú ni superficies, deja el menú y las superficies de Brasa', () => {
    const viejo = {
      primary: '#1D4ED8',
      primaryHover: '#103DC7',
      primaryStrong: '#0832BC',
      primarySoft: '#F0F5FF',
      onPrimary: '#FFFFFF',
      accent: '#956CD7',
      accentSoft: '#F6F3FF',
      gradientFrom: '#1D4ED8',
      gradientTo: '#0D39C3',
      gradientEdge: '#052AB6',
    };
    const t = sanitizeTokens({ light: viejo, dark: viejo });
    expect(t.light.primary).toBe('#1D4ED8');
    for (const modo of ['light', 'dark'] as const) {
      for (const rol of [
        'side',
        'sideRaised',
        'sideLine',
        'sideText',
        'sideMuted',
        'sideAccent',
        'canvas',
        'surface',
        'outline',
      ] as const) {
        expect(t[modo][rol]).toBe(BRASA_TOKENS[modo][rol]);
      }
    }
  });

  it('un rol nuevo malicioso (menú o superficie) también toma el de Brasa', () => {
    const t = sanitizeTokens({
      light: { ...modo('#1D4ED8'), side: MALICIOSO },
      dark: { ...modo('#1D4ED8'), surface: 'url(x)' },
    });
    expect(t.light.side).toBe(BRASA_TOKENS.light.side);
    expect(t.dark.surface).toBe(BRASA_TOKENS.dark.surface);
    expect(companyThemeCss(t)).not.toContain('url(');
  });

  it('MUI toma las superficies del tema de la empresa; sin tema, las de Brasa', () => {
    const tokens = sanitizeTokens({
      light: modo('#6D28D9'),
      dark: { ...modo('#9162FF'), canvas: '#0F0D18', surface: '#1A1823', outline: '#383542', surfaceMuted: '#2A2834' },
    });
    const oscuro = createAppTheme('dark', tokens);
    expect(oscuro.palette.background.default).toBe('#0F0D18');
    expect(oscuro.palette.background.paper).toBe('#1A1823');
    expect(oscuro.palette.divider).toBe('#383542');
    const brasa = createAppTheme('dark');
    expect(brasa.palette.background.paper).toBe(BRASA_TOKENS.dark.surface);
    expect(brasa.palette.background.default).toBe(BRASA_TOKENS.dark.canvas);
  });

  it('Brasa: el menú es el mismo en los dos modos y sale de brand.sidebar (la fuente de las variables de tailwind)', () => {
    const { sidebar } = brand;
    const esperado = {
      side: sidebar.bg,
      sideRaised: sidebar.raised,
      sideLine: sidebar.line,
      sideText: sidebar.text,
      sideMuted: sidebar.muted,
      sideAccent: sidebar.accent,
    };
    for (const modo of ['light', 'dark'] as const) expect(BRASA_TOKENS[modo]).toMatchObject(esperado);
    const tailwind = readFileSync(join(process.cwd(), 'tailwind.config.js'), 'utf8');
    for (const [variable, clave] of [
      ['side', 'bg'],
      ["'side-raised'", 'raised'],
      ["'side-line'", 'line'],
      ["'side-text'", 'text'],
      ["'side-muted'", 'muted'],
      ["'side-accent'", 'accent'],
    ]) {
      expect(tailwind).toContain(`${variable}: sidebar.${clave},`);
    }
  });

  it('Brasa: el texto del menú se lee sobre el fondo, el realce y bajo el brillo; las iniciales sobre el borde', () => {
    const { sidebar, llama } = brand;
    // `.side-glow` pinta el principal al 22 %: el back mide con el mismo valor (BRILLO_DEL_MENU).
    const css = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toContain('rgb(var(--c-primary) / 22%)');
    const brillo = mix(sidebar.bg, llama['600'], 0.22);
    for (const texto of [sidebar.text, sidebar.muted]) {
      for (const fondo of [sidebar.bg, sidebar.raised, brillo])
        expect(contrast(texto, fondo)).toBeGreaterThanOrEqual(4.5);
    }
    for (const fondo of [sidebar.bg, sidebar.raised, sidebar.line]) {
      expect(contrast(sidebar.accent, fondo)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(sidebar.accent, mix(sidebar.bg, llama['600'], 0.16))).toBeGreaterThanOrEqual(3);
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
