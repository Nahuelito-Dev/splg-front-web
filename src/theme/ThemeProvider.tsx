import { useMemo, type ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { createAppTheme } from './muiTheme';
import { ThemeModeProvider } from './ThemeModeContext';
import { useThemeMode } from './useThemeMode';

interface Props {
  children: ReactNode;
}

/** Arma el tema de MUI según el modo resuelto (claro/oscuro) del `ThemeModeProvider`. */
const MuiBridge = ({ children }: Props) => {
  const { resolvedMode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

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
