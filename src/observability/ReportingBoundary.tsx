import * as Sentry from '@sentry/react';
import type { ReactNode } from 'react';

/** Vuelve a tirar el error ya reportado: lo atrapa el boundary de React Router y se ve la pantalla de error de siempre. */
const Rethrow = ({ error }: { error: unknown }): never => {
  throw error;
};

/**
 * Reporta a Sentry los errores de render (con el árbol de componentes) sin cambiar lo que ve el usuario: el panel no
 * tiene pantalla de error propia, así que se deja que la dibuje React Router como hasta ahora.
 */
export const ReportingBoundary = ({ children }: { children: ReactNode }) => (
  <Sentry.ErrorBoundary fallback={({ error }) => <Rethrow error={error} />}>{children}</Sentry.ErrorBoundary>
);
