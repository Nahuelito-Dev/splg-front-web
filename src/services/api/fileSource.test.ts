import { describe, expect, it, vi } from 'vitest';
import { resolveFileSource } from './fileSource';

describe('resolveFileSource', () => {
  it('con una URL firmada (requiresAuth false) la usa directo y no baja el archivo', async () => {
    const getBlob = vi.fn();
    const source = await resolveFileSource(
      () =>
        Promise.resolve({ url: 'https://s3.example/x?sig=1', expiresAt: '2026-10-03T12:00:00Z', requiresAuth: false }),
      getBlob,
    );
    expect(source).toEqual({ kind: 'url', url: 'https://s3.example/x?sig=1', expiresAt: '2026-10-03T12:00:00Z' });
    expect(getBlob).not.toHaveBeenCalled();
  });

  it('con requiresAuth true (driver local) baja el archivo autenticado', async () => {
    const blob = new Blob(['x']);
    const source = await resolveFileSource(
      () => Promise.resolve({ url: '/api/x', expiresAt: null, requiresAuth: true }),
      () => Promise.resolve(blob),
    );
    expect(source).toEqual({ kind: 'blob', blob });
  });

  it('sin archivo (url null) resuelve null y no baja nada', async () => {
    const getBlob = vi.fn();
    expect(
      await resolveFileSource(() => Promise.resolve({ url: null, expiresAt: null, requiresAuth: false }), getBlob),
    ).toBeNull();
    expect(getBlob).not.toHaveBeenCalled();
  });

  it('si el back falla al pedir el link, el error sube sin intentar la descarga', async () => {
    const getBlob = vi.fn();
    await expect(resolveFileSource(() => Promise.reject(new Error('404')), getBlob)).rejects.toThrow('404');
    expect(getBlob).not.toHaveBeenCalled();
  });
});
