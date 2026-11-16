import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * En el runner de GitHub, con toda la suite en paralelo, una pantalla puede tardar más del segundo que
 * `waitFor`/`findBy*` esperan por omisión: fallaba un test distinto en cada corrida. Se esperan hasta 5 s
 * (sigue siendo un tope: un test que nunca llega a cumplirse falla igual).
 */
configure({ asyncUtilTimeout: 5000 });

/**
 * El router de datos arma `new Request(url, { signal })` con el `AbortSignal` de jsdom, que el `Request` de Node
 * (undici) rechaza. Se crea el `Request` sin señal y se le pone la original como `signal`: así la cancelación de una
 * navegación (`controller.abort()` del router) sigue llegando a quien lee `request.signal`.
 */
const NodeRequest = globalThis.Request;
globalThis.Request = class PatchedRequest extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const signal = init?.signal;
    super(input, signal ? { ...init, signal: undefined } : init);
    if (signal) Object.defineProperty(this, 'signal', { value: signal });
  }
};

/**
 * Las pantallas que exportan desde el back montan `useServerExport` (React Query y sesión); sus tests no arman esos
 * proveedores. Se reemplaza por las dos acciones del menú: el propio hook se prueba con `vi.unmock`.
 */
vi.mock('../hooks/useServerExport', () => ({
  // Registra lo que recibe (los tests de pantalla verifican recurso, filtros y bloqueos) y apaga las acciones
  // bloqueadas como lo hace el menú real.
  useServerExport: vi.fn((config?: { blockedReason?: string }) =>
    config
      ? [
          { label: 'Exportar CSV', onClick: () => undefined, blockedReason: config.blockedReason },
          { label: 'Exportar Excel', onClick: () => undefined, blockedReason: config.blockedReason },
        ]
      : [],
  ),
}));

/**
 * Cada avatar de persona pide su foto con `usePersonPhoto` (React Query); los tests de pantalla no arman ese
 * proveedor ni la llamada de red. Se reemplaza por «sin foto» (quedan las iniciales): el hook y el avatar se
 * prueban con `vi.unmock`.
 */
vi.mock('../services/queries/peoplePhotos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePersonPhoto: vi.fn(() => ({ data: null, refetch: vi.fn() })),
}));

/**
 * jsdom no tiene Google Maps: los mapas se dibujan con `googleMapsMock` (el mapa, sus líneas y polígonos como `div` con
 * sus datos) y los marcadores HTML en el lugar. El kit del mapa (`MapCanvas`) se prueba con estos mismos dobles.
 */
vi.mock('@vis.gl/react-google-maps', async () => ({
  ...(await import('./googleMapsMock')),
  ...(await import('./googleMapsHandlers')),
}));
vi.mock('../common/components/map/HtmlMarker', () => import('./htmlMarkerMock'));
