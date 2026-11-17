import { addIntegration, replayIntegration } from '@sentry/react';
import { createRecordingFilter, ownOrigins } from './replay';

/**
 * Session Replay con todo enmascarado y el filtro de la grabación (URLs sin query, recursos ajenos fuera). Módulo
 * aparte para cargarlo con `import()` sólo cuando está prendido (`VITE_SENTRY_REPLAY=true`).
 */
export const addReplayIntegration = (apiUrl: string, pageOrigin: string) => {
  addIntegration(
    replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      beforeAddRecordingEvent: createRecordingFilter(ownOrigins(apiUrl, pageOrigin)),
    }),
  );
};
