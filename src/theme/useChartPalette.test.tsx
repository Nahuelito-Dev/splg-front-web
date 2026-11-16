import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { applyCompanyTheme, clearCompanyTheme } from './companyTheme';
import { ThemeModeContext } from './themeModeContextValue';
import { useChartPalette } from './useChartPalette';
import brand from './brand.json';
import { BRASA_TOKENS } from './themeTokens';

const Probe = () => {
  const palette = useChartPalette();
  return (
    <>
      <output>{`${palette.primary}|${palette.accent}`}</output>
      <output aria-label="superficies">{`${palette.grid}|${palette.cursor}|${palette.tooltipBg}|${palette.tooltipBorder}`}</output>
    </>
  );
};

const tokens = {
  light: {
    ...BRASA_TOKENS.light,
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
    ...BRASA_TOKENS.dark,
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

  it.each([
    ['claro', 'light'],
    ['oscuro', 'dark'],
  ] as const)('grilla, cursor y tooltip salen de las superficies del tema en modo %s', (_name, resolvedMode) => {
    const tinted = {
      ...tokens,
      [resolvedMode]: {
        ...tokens[resolvedMode],
        outlineSoft: '#202836',
        surfaceHover: '#152429',
        surface: '#0C1B1F',
        outline: '#29393E',
      },
    };
    applyCompanyTheme(tinted);
    render(
      <ThemeModeContext.Provider value={{ mode: resolvedMode, resolvedMode, setMode: () => undefined }}>
        <Probe />
      </ThemeModeContext.Provider>,
    );
    expect(screen.getByLabelText('superficies')).toHaveTextContent('#202836|#152429|#0C1B1F|#29393E');
  });

  it.each([
    ['claro', 'light', `${brand.tinta['100']}|${brand.tinta['50']}|#FFFFFF|${brand.tinta['200']}`],
    [
      'oscuro',
      'dark',
      `${brand.dark.outlineSoft}|${brand.dark.surfaceHover}|${brand.dark.surface}|${brand.dark.outline}`,
    ],
  ] as const)('sin tema, las superficies de Brasa de siempre en modo %s', (_name, resolvedMode, esperado) => {
    render(
      <ThemeModeContext.Provider value={{ mode: resolvedMode, resolvedMode, setMode: () => undefined }}>
        <Probe />
      </ThemeModeContext.Provider>,
    );
    expect(screen.getByLabelText('superficies')).toHaveTextContent(esperado);
  });
});
