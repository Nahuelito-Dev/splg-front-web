import * as Sentry from '@sentry/react';
import { Routes } from 'react-router-dom';

/**
 * `<Routes>` instrumentado: cada `<Routes>` anidado le cuenta a Sentry sus rutas, así la transacción se llama
 * `/customers/:id` y no `/customers/3f2a…`. Sin Sentry inicializado dibuja `<Routes>` tal cual.
 */
export const SentryRoutes = Sentry.wrapReactRouterRouting(Routes);
