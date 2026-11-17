import type { BrowserOptions, Event, ReplayFrameEvent } from '@sentry/react';
import { scrubBreadcrumb, scrubUrl, scrubValue } from './scrub';

/** El SDK no exporta el tipo de una integración: se toma de las opciones. */
type Integration = Extract<NonNullable<BrowserOptions['integrations']>, readonly unknown[]>[number];

/** Los orígenes cuyos recursos pueden quedar en la grabación: el panel y la API. El resto (S3, Google…) no. */
export const ownOrigins = (apiUrl: string, pageOrigin: string): Set<string> => {
  const origins = new Set<string>([pageOrigin]);
  try {
    origins.add(new URL(apiUrl).origin);
  } catch {
    // Sin URL de API válida queda sólo el origen del panel.
  }
  return origins;
};

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Filtro de la grabación de Replay (`beforeAddRecordingEvent`): las navegaciones y los recursos van sin query (búsquedas
 * por DNI o teléfono, `?session=`, firmas de S3) y los recursos de dominios ajenos se descartan enteros (las URLs
 * firmadas de S3 traen `X-Amz-Signature`). Los breadcrumbs pasan por el mismo filtro que los de los errores.
 */
export const createRecordingFilter =
  (origins: Set<string>) =>
  (event: ReplayFrameEvent): ReplayFrameEvent | null => {
    if (event.data.tag === 'breadcrumb') {
      return { ...event, data: { ...event.data, payload: scrubBreadcrumb(event.data.payload) } };
    }
    if (event.data.tag !== 'performanceSpan') return event;
    const span = event.data.payload;
    if (span.op.startsWith('resource.')) {
      const origin = originOf(span.description);
      if (origin === null || !origins.has(origin)) return null;
    }
    const data: unknown = span.data;
    return {
      ...event,
      data: {
        ...event.data,
        payload: {
          ...span,
          description: scrubUrl(span.description),
          data: scrubValue(data) as typeof span.data,
        },
      },
    };
  };

interface ReplayEventFields {
  urls?: unknown;
}

/**
 * El evento que acompaña a cada segmento de Replay (`replay_event`) lleva `urls` y `request.url` con la URL completa
 * de la página. No pasa por `beforeSend`: se limpia con un procesador de eventos.
 */
export const scrubReplayEvent = (event: Event): Event => {
  if (event.type !== 'replay_event') return event;
  const scrubbed: Event & ReplayEventFields = { ...event };
  const { urls } = event as Event & ReplayEventFields;
  if (Array.isArray(urls)) {
    scrubbed.urls = urls.map((url: unknown) => (typeof url === 'string' ? scrubUrl(url) : url));
  }
  if (event.request?.url) scrubbed.request = { ...event.request, url: scrubUrl(event.request.url) };
  return scrubbed;
};

export const replayEventScrubIntegration = (): Integration => ({
  name: 'SplgReplayEventScrub',
  processEvent: (event: Event) => scrubReplayEvent(event),
});
