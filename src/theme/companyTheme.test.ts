import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThemeModeTokens, ThemeTokens } from '../services/api/types';
import {
  applyCompanyTheme,
  clearCompanyTheme,
  companyThemeCss,
  companyThemeStore,
  hexToChannels,
} from './companyTheme';
import { BRASA_TOKENS } from './themeTokens';

const modo = (primary: string): ThemeModeTokens => ({
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
const AZUL: ThemeTokens = { light: modo('#1D4ED8'), dark: modo('#265AE4') };
const VERDE: ThemeTokens = { light: modo('#0E7C3A'), dark: modo('#0E7C3A') };

const hoja = () => document.getElementById('splg-tema-empresa');

afterEach(() => clearCompanyTheme());

describe('tema de la empresa', () => {
  it('hexToChannels convierte a canales y rechaza lo que no es un color', () => {
    expect(hexToChannels('#1D4ED8')).toBe('29 78 216');
    expect(hexToChannels('red')).toBeNull();
    expect(hexToChannels('#FFF')).toBeNull();
  });

  it('arma una regla para claro y otra para oscuro con las variables de los roles', () => {
    const css = companyThemeCss(AZUL);
    expect(css).toContain(':root:root { --c-primary: 29 78 216;');
    expect(css).toContain(':root:root.dark { --c-primary: 38 90 228;');
    for (const rol of [
      'primary-hover',
      'primary-strong',
      'primary-soft',
      'on-primary',
      'accent',
      'accent-soft',
      'primary-from',
      'primary-to',
      'primary-edge',
    ]) {
      expect(css).toContain(`--c-${rol}:`);
    }
  });

  it('pisa el menú lateral y las superficies con los tokens de cada modo', () => {
    const violeta: ThemeTokens = {
      light: { ...modo('#6D28D9'), side: '#100A20', sideRaised: '#19142B', sideAccent: '#9162FF' },
      dark: {
        ...modo('#9162FF'),
        side: '#100A20',
        sideRaised: '#19142B',
        sideAccent: '#9162FF',
        canvas: '#0F0D18',
        surface: '#1A1823',
        outline: '#383542',
      },
    };
    const [claro, oscuro] = companyThemeCss(violeta).split('\n');
    for (const regla of [claro, oscuro]) {
      expect(regla).toContain('--c-side: 16 10 32;');
      expect(regla).toContain('--c-side-raised: 25 20 43;');
      expect(regla).toContain('--c-side-accent: 145 98 255;');
      for (const rol of [
        'side-line',
        'side-text',
        'side-muted',
        'surface-hover',
        'surface-sunken',
        'surface-muted',
        'outline-soft',
      ]) {
        expect(regla).toContain(`--c-${rol}:`);
      }
    }
    expect(claro).toContain('--c-surface: 255 255 255;');
    expect(oscuro).toContain('--c-bg: 15 13 24;');
    expect(oscuro).toContain('--c-surface: 26 24 35;');
    expect(oscuro).toContain('--c-outline: 56 53 66;');
  });

  it('aplica, reemplaza y limpia la hoja; avisa a los suscriptos sólo si cambia', () => {
    const listener = vi.fn();
    const unsubscribe = companyThemeStore.subscribe(listener);
    applyCompanyTheme(AZUL);
    expect(hoja()?.textContent).toContain('29 78 216');
    expect(companyThemeStore.getSnapshot()).toBe(AZUL);
    applyCompanyTheme(AZUL);
    expect(listener).toHaveBeenCalledTimes(1);
    applyCompanyTheme(VERDE);
    expect(document.querySelectorAll('#splg-tema-empresa')).toHaveLength(1);
    expect(hoja()?.textContent).toContain('14 124 58');
    clearCompanyTheme();
    expect(hoja()).toBeNull();
    expect(companyThemeStore.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
