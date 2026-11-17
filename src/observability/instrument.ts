import { initSentry } from './sentry';

/**
 * Primer import de `index.tsx`: Sentry tiene que arrancar antes de que se cree el router y se monte la app (si no, la
 * primera carga no queda medida y los errores de arranque no llegan). Sin `VITE_SENTRY_DSN` no hace nada.
 */
initSentry();
