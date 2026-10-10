import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RequestConfig {
  url: string;
  method: string;
  data: FormData;
  headers: Record<string, string>;
}
const http = vi.hoisted(() => ({
  get: vi.fn(),
  request: vi.fn<[RequestConfig], Promise<unknown>>(),
  delete: vi.fn(),
}));
vi.mock('./httpClient', () => ({ http }));

import { getPhotoLink, photoMaxBytes, photoRemovable, removePhoto, uploadPhoto, type PhotoKind } from './photos';

beforeEach(() => {
  vi.clearAllMocks();
});

const PATHS: [PhotoKind, string][] = [
  ['user', '/users/x1/photo'],
  ['car', '/car/x1/photo'],
  ['gasCylinder', '/gascylinder/x1/photo'],
  ['distributor', '/distributor/x1/logo'],
  ['incident', '/incidents/x1/photo'],
  ['claim', '/claims/x1/photo'],
];

describe('rutas de las fotos', () => {
  it.each(PATHS)('%s usa %s', async (kind, path) => {
    http.get.mockResolvedValue({ data: { url: null, expiresAt: null, requiresAuth: false } });
    await getPhotoLink(kind, 'x1');
    expect(http.get).toHaveBeenCalledWith(path, { params: { modo: 'url' } });
    await removePhoto(kind, 'x1');
    expect(http.delete).toHaveBeenCalledWith(path);
  });

  it('la foto propia se pide con el id «me»', async () => {
    http.get.mockResolvedValue({ data: { url: null, expiresAt: null, requiresAuth: false } });
    await getPhotoLink('user', 'me');
    expect(http.get).toHaveBeenCalledWith('/users/me/photo', { params: { modo: 'url' } });
  });
});

describe('uploadPhoto', () => {
  const file = new File(['x'], 'foto.png', { type: 'image/png' });

  it('sube con PUT multipart en el campo `file`', async () => {
    http.request.mockResolvedValue({ data: {} });
    await uploadPhoto('car', 'c1', file);
    const config = http.request.mock.calls[0][0];
    expect(config.method).toBe('put');
    expect(config.url).toBe('/car/c1/photo');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(config.data.get('file')).toBe(file);
  });

  it('el reclamo sube con POST', async () => {
    http.request.mockResolvedValue({ data: {} });
    await uploadPhoto('claim', 'k1', file);
    expect(http.request.mock.calls[0][0].method).toBe('post');
  });
});

describe('reglas por recurso', () => {
  it('el reclamo admite 10 MB y no se puede quitar; el resto 5 MB y sí', () => {
    expect(photoMaxBytes('claim')).toBe(10 * 1024 * 1024);
    expect(photoRemovable('claim')).toBe(false);
    expect(photoMaxBytes('car')).toBe(5 * 1024 * 1024);
    expect(photoRemovable('car')).toBe(true);
  });
});
