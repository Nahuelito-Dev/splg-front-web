import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThemeModeTokens, ThemeTokens } from '../services/api/types';
import {
  applyCompanyTheme,
  clearCompanyTheme,
  companyThemeCss,
  companyThemeStore,
  hexToChannels,
} from './companyTheme';

const modo = (primary: string): ThemeModeTokens => ({
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
