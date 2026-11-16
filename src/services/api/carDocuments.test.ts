import { afterEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn<unknown[], Promise<unknown>>(),
  post: vi.fn<unknown[], Promise<unknown>>(),
  delete: vi.fn<unknown[], Promise<unknown>>(),
}));
const V2 = { baseURL: expect.stringMatching(/\/v2$/) as unknown };
vi.mock('./httpClient', () => ({ http }));

import {
  deleteCarDocument,
  getCarDocumentLink,
  listCarDocuments,
  uploadCarDocument,
  uploadPatentPhoto,
} from './carDocuments';

afterEach(() => {
  vi.clearAllMocks();
});

describe('carDocuments (API v2)', () => {
  it('lista, baja la URL firmada y da de baja contra /v2/cars/:carId/documents', async () => {
    http.get.mockResolvedValue({ data: [] });
    http.delete.mockResolvedValue({});
    await listCarDocuments('car-1');
    expect(http.get).toHaveBeenCalledWith('/cars/car-1/documents', expect.objectContaining(V2));
    await getCarDocumentLink('car-1', 'att-1');
    expect(http.get).toHaveBeenLastCalledWith(
      '/cars/car-1/documents/att-1/download',
      expect.objectContaining({ params: { modo: 'url' } }),
    );
    await deleteCarDocument('car-1', 'att-1');
    expect(http.delete).toHaveBeenCalledWith('/cars/car-1/documents/att-1', expect.objectContaining(V2));
  });

  it('sube multipart con documentType y la clave de idempotencia', async () => {
    http.post.mockResolvedValue({ data: {} });
    const file = new File(['%PDF'], 'p.pdf', { type: 'application/pdf' });
    await uploadCarDocument('car-1', 'seguro', file, 'k-1');
    const [url, form, config] = http.post.mock.calls[0] as [string, FormData, { headers: Record<string, string> }];
    expect(url).toBe('/cars/car-1/documents');
    expect(form.get('documentType')).toBe('seguro');
    expect(form.get('file')).toBeInstanceOf(File);
    expect(config.headers).toMatchObject({ 'Content-Type': 'multipart/form-data', 'Idempotency-Key': 'k-1' });
    await uploadPatentPhoto('car-1', file, 'k-2');
    expect(http.post.mock.calls[1]?.[0]).toBe('/cars/car-1/documents/patent-photo');
  });
});
