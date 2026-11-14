import { QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { CompanyThemeSync } from './common/components/CompanyThemeSync';
import { ConfirmDialogHost } from './common/components/ui/ConfirmDialog';
import { SocketProvider } from './context/SocketContext';
import { Navigation } from './router/Navigation';
import { queryClient } from './services/queries/queryClient';
import { ThemeProvider } from './theme';

export const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <CompanyThemeSync />
      <SocketProvider>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={4000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Navigation />
          <ConfirmDialogHost />
        </SnackbarProvider>
      </SocketProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
