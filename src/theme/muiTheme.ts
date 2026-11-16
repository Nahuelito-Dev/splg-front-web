import { createTheme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';
import { esES as esESGrid } from '@mui/x-data-grid/locales';
import brand from './brand.json';
import { dataGridComponents } from './components/dataGrid';
import { overlayComponents } from './components/overlays';
import type { ResolvedThemeMode } from './themeMode';
import type { ThemeTokens } from '../services/api/types';
import { onColor } from './colorContrast';

const { llama, gas, tinta, status, dark } = brand;
const font = 'Geist, "Helvetica Neue", Arial, sans-serif';

/**
 * Tema de MUI con la misma paleta que Tailwind (brand.json). MUI se usa para
 * la grilla de datos, los íconos y algunos controles; el resto va con
 * Tailwind. `createAppTheme` arma un tema por modo: los dos leen de
 * `brand.json` (claro de la raíz, oscuro de `brand.json#/dark`). Con `company` (los tokens del tema de la empresa del
 * contexto) el principal, el secundario y las superficies salen de ahí, como en Tailwind.
 */
export const createAppTheme = (mode: ResolvedThemeMode, company: ThemeTokens | null = null) => {
  const tokens = company?.[mode];
  return createTheme(
    {
      palette: {
        mode,
        primary: tokens
          ? {
              main: tokens.primary,
              dark: tokens.primaryHover,
              light: tokens.primarySoft,
              contrastText: tokens.onPrimary,
            }
          : { main: llama['600'], dark: llama['700'], light: llama['400'], contrastText: '#FFFFFF' },
        secondary: tokens
          ? { main: tokens.accent, contrastText: onColor(tokens.accent) }
          : { main: gas['400'], dark: gas['500'], light: gas['200'], contrastText: tinta['900'] },
        success: { main: mode === 'dark' ? dark.status.success : status.success },
        error: { main: mode === 'dark' ? dark.status.danger : status.danger },
        warning: { main: mode === 'dark' ? dark.status.warn : status.warn },
        info: { main: mode === 'dark' ? dark.status.info : status.info },
        text: {
          primary: mode === 'dark' ? dark.ink : tinta['900'],
          secondary: mode === 'dark' ? dark.muted : tinta['500'],
        },
        divider: tokens?.outline ?? (mode === 'dark' ? dark.outline : tinta['200']),
        background: {
          default: tokens?.canvas ?? (mode === 'dark' ? dark.canvas : brand.canvas),
          paper: tokens?.surface ?? (mode === 'dark' ? dark.surface : '#FFFFFF'),
        },
      },
      typography: {
        fontFamily: font,
        button: { textTransform: 'none', fontWeight: 600 },
      },
      shape: { borderRadius: 10 },
      components: {
        ...overlayComponents(mode, tokens),
        ...dataGridComponents(mode, tokens),
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              backgroundColor: mode === 'dark' ? (tokens?.surfaceMuted ?? dark.surfaceMuted) : tinta['900'],
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: 8,
            },
          },
        },
      },
    },
    esES,
    esESGrid,
  );
};
