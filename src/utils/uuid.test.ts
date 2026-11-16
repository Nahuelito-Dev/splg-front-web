import { afterEach, describe, expect, it, vi } from 'vitest';
import { newUuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa crypto.randomUUID cuando el contexto es seguro', () => {
    expect(newUuid()).toMatch(V4);
  });

  it('fuera de un contexto seguro (sin randomUUID) igual da un UUID v4 válido y distinto cada vez', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real), randomUUID: undefined });
    const ids = new Set(Array.from({ length: 200 }, () => newUuid()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(V4);
  });
});
