import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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
