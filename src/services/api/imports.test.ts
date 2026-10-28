import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import { ApiError } from './errors';
import { confirmImport, downloadImportTemplate, previewImport } from './imports';

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
});

describe('downloadImportTemplate', () => {
  it('pide la plantilla a la v2 con el formato y la baja como blob', async () => {
    const blob = new Blob(['Tipo;Peso']);
    http.get.mockResolvedValue({ data: blob });

    const file = await downloadImportTemplate('precios', 'xlsx');

    expect(http.get).toHaveBeenCalledWith('/imports/precios/template', {
      baseURL: env.apiUrlV2,
      params: { format: 'xlsx' },
      responseType: 'blob',
    });
    expect(file).toEqual({ blob, filename: 'plantilla-precios.xlsx' });
  });

  it('un error del back llega con su mensaje real, aunque venga dentro del blob', async () => {
    const body = new Blob([JSON.stringify({ message: 'Recurso inválido' })], { type: 'application/json' });
    const error = new AxiosError('Request failed');
    error.response = { status: 400, data: body, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
    http.get.mockRejectedValue(error);
    const caught = await downloadImportTemplate('stock', 'csv').catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).messages).toEqual(['Recurso inválido']);
  });
});

describe('previewImport', () => {
  it('sube el archivo como multipart en el campo `file`, sin el JSON por defecto', async () => {
    const preview = { importId: 'i-1', estado: 'pending' };
    http.post.mockResolvedValue({ data: preview });
    const file = new File(['a'], 'garrafas.csv', { type: 'text/csv' });

    await expect(previewImport('garrafas', file)).resolves.toBe(preview);

    const [url, body, config] = http.post.mock.calls[0] as [string, FormData, Record<string, unknown>];
    expect(url).toBe('/imports/garrafas/preview');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(config).toEqual({ baseURL: env.apiUrlV2, headers: { 'Content-Type': undefined } });
  });

  it('el rechazo del back (encabezado, tamaño, formato) sube tal cual', async () => {
    const error = new AxiosError('Request failed');
    error.response = {
      status: 400,
      data: { message: 'El encabezado no coincide' },
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    http.post.mockRejectedValue(error);
    await expect(previewImport('stock', new File(['a'], 'x.csv'))).rejects.toBe(error);
  });
});

describe('confirmImport', () => {
  it('confirma por id contra la v2', async () => {
    const result = { estado: 'confirmed', yaConfirmada: false };
    http.post.mockResolvedValue({ data: result });
    await expect(confirmImport('i-1')).resolves.toBe(result);
    expect(http.post).toHaveBeenCalledWith('/imports/i-1/confirm', undefined, { baseURL: env.apiUrlV2 });
  });
});
