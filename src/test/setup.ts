import '@testing-library/jest-dom/vitest';

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
