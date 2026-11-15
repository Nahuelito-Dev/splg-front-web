import { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { companyThemeStore } from './companyTheme';
import { createAppTheme } from './muiTheme';
import { ThemeModeProvider } from './ThemeModeContext';
import { useThemeMode } from './useThemeMode';

interface Props {
  children: ReactNode;
}

/** Arma el tema de MUI según el modo resuelto (claro/oscuro) y el tema de la empresa del contexto, si hay. */
const MuiBridge = ({ children }: Props) => {
  const { resolvedMode } = useThemeMode();
  const company = useSyncExternalStore(companyThemeStore.subscribe, companyThemeStore.getSnapshot);
  const theme = useMemo(() => createAppTheme(resolvedMode, company), [resolvedMode, company]);

  return (
    <StyledEngineProvider injectFirst>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </StyledEngineProvider>
  );
};

export const ThemeProvider = ({ children }: Props) => (
  <ThemeModeProvider>
    <MuiBridge>{children}</MuiBridge>
  </ThemeModeProvider>
);
