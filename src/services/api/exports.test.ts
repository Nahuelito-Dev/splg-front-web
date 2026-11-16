import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('./httpClient', () => ({ http: { get } }));

import { env } from '../../config/env';
import { toIsoDay } from '../../utils/dates';
import { ApiError } from './errors';
import { downloadExport } from './exports';

beforeEach(() => {
  get.mockReset();
});

describe('downloadExport', () => {
  it('pide el recurso a la v2 con el formato y los filtros, sin paginar, y lee X-Total-Count', async () => {
    const blob = new Blob(['a;b']);
    get.mockResolvedValue({ data: blob, headers: { 'x-total-count': '231' } });

    const file = await downloadExport('clientes', 'xlsx', { term: 'ana', status: 'active' });

    expect(get).toHaveBeenCalledWith('/exports/clientes', {
      baseURL: env.apiUrlV2,
      params: { term: 'ana', status: 'active', format: 'xlsx' },
      responseType: 'blob',
    });
    expect(file.blob).toBe(blob);
    expect(file.total).toBe(231);
    expect(file.filename).toBe(`clientes-${toIsoDay(new Date())}.xlsx`);
  });

  it('sin la cabecera el total es 0, nunca un número inventado', async () => {
    get.mockResolvedValue({ data: new Blob([]), headers: {} });
    expect((await downloadExport('pedidos', 'csv')).total).toBe(0);
  });

  it('un error del back llega con su mensaje real, aunque venga dentro del blob', async () => {
    const body = new Blob([JSON.stringify({ message: 'Hay más filas que el tope' })], { type: 'application/json' });
    const error = new AxiosError('Request failed');
    error.response = { status: 400, data: body, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
    get.mockRejectedValue(error);
    const caught = await downloadExport('pedidos', 'csv').catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(400);
    expect((caught as ApiError).messages).toEqual(['Hay más filas que el tope']);
  });
});
