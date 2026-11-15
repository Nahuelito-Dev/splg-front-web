import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { applyCompanyTheme, clearCompanyTheme } from './companyTheme';
import { ThemeModeContext } from './themeModeContextValue';
import { useChartPalette } from './useChartPalette';
import brand from './brand.json';

const Probe = () => {
  const palette = useChartPalette();
  return <output>{`${palette.primary}|${palette.accent}`}</output>;
};

const tokens = {
  light: {
    primary: '#806000',
    primaryHover: '#705000',
    primaryStrong: '#705000',
    primarySoft: '#FFF8DB',
    onPrimary: '#FFFFFF',
    accent: '#D6A500',
    accentSoft: '#FFF1B8',
    gradientFrom: '#806000',
    gradientTo: '#705000',
    gradientEdge: '#705000',
  },
  dark: {
    primary: '#D6A500',
    primaryHover: '#E7B900',
    primaryStrong: '#E7B900',
    primarySoft: '#3B3100',
    onPrimary: '#0B1220',
    accent: '#F4CB40',
    accentSoft: '#3B3100',
    gradientFrom: '#D6A500',
    gradientTo: '#E7B900',
    gradientEdge: '#E7B900',
  },
};

afterEach(() => {
  clearCompanyTheme();
  cleanup();
});

describe('useChartPalette', () => {
  it('toma las series de identidad del tema activo', () => {
    applyCompanyTheme(tokens);
    render(
      <ThemeModeContext.Provider value={{ mode: 'light', resolvedMode: 'light', setMode: () => undefined }}>
        <Probe />
      </ThemeModeContext.Provider>,
    );
    expect(screen.getByText('#806000|#D6A500')).toBeInTheDocument();
  });

  it.each([
    ['claro', 'light', brand.llama['500'], brand.gas['500']],
    ['oscuro', 'dark', brand.llama['500'], brand.gas['500']],
  ] as const)('vuelve a Brasa sin tema en modo %s', (_name, resolvedMode, primary, accent) => {
    render(
      <ThemeModeContext.Provider value={{ mode: resolvedMode, resolvedMode, setMode: () => undefined }}>
        <Probe />
      </ThemeModeContext.Provider>,
    );
    expect(screen.getByText(`${primary}|${accent}`)).toBeInTheDocument();
  });

  it('toma los tokens oscuros del tema activo', () => {
    applyCompanyTheme(tokens);
    render(
      <ThemeModeContext.Provider value={{ mode: 'dark', resolvedMode: 'dark', setMode: () => undefined }}>
        <Probe />
      </ThemeModeContext.Provider>,
    );
    expect(screen.getByText('#D6A500|#F4CB40')).toBeInTheDocument();
  });
});
