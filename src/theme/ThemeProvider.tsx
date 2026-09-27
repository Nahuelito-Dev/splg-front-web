import type { ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider as MUIThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { muiTheme } from './muiTheme';

interface Props {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: Props) => (
  <StyledEngineProvider injectFirst>
    <MUIThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  </StyledEngineProvider>
);
