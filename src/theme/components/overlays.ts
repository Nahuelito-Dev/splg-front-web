import type { Components, Theme } from '@mui/material/styles';
import type { ResolvedThemeMode } from '../themeMode';
import { SHADOW_DIALOG, SHADOW_MENU, surfaceTokens } from './palette';

/** Menús, popovers, diálogos, paneles laterales y fondo: se ven igual en todo el panel sin clases por pantalla. */
export const overlayComponents = (mode: ResolvedThemeMode): Components<Theme> => {
  const t = surfaceTokens(mode);
  return {
    MuiPopover: {
      styleOverrides: {
        paper: {
          marginTop: 4,
          backgroundImage: 'none',
          border: `1px solid ${t.outline}`,
          borderRadius: 12,
          boxShadow: SHADOW_MENU,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { minWidth: 180 },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          gap: 10,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 8,
          fontSize: 13,
          color: t.ink,
          '&:hover': { backgroundColor: t.surfaceHover },
          '&.Mui-focusVisible': { backgroundColor: t.surfaceHover },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          borderRadius: 14,
          boxShadow: SHADOW_DIALOG,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: 'none', border: 0, boxShadow: SHADOW_DIALOG },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { backgroundColor: t.backdrop },
        invisible: { backgroundColor: 'transparent' },
      },
    },
  };
};
