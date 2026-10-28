import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('./httpClient', () => ({ http: { get } }));

import { env } from '../../config/env';
import { ApiError } from './errors';
import { downloadPdf, type PdfRequest } from './pdfs';

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: new Blob(['%PDF']), headers: {} });
});

describe('downloadPdf', () => {
  const casos: [PdfRequest, string, Record<string, string>][] = [
    [{ kind: 'order-remito', orderId: 'o1' }, '/orders/o1/remito.pdf', {}],
    [{ kind: 'order-recibo', orderId: 'o1' }, '/orders/o1/recibo.pdf', {}],
    [{ kind: 'settlement', settlementId: 's1' }, '/driver-settlements/s1/pdf', {}],
    [{ kind: 'liquidation', liquidationId: 'l1' }, '/driver-liquidations/l1/pdf', {}],
    [{ kind: 'cash-session', sessionId: 'c1' }, '/cash-sessions/c1/pdf', {}],
    [
      { kind: 'sales', from: '2026-10-01', to: '2026-10-28' },
      '/reports/sales.pdf',
      { desde: '2026-10-01', hasta: '2026-10-28' },
    ],
  ];

  it.each(casos)('%j pide %s a la v2 como blob', async (request, path, params) => {
    const file = await downloadPdf(request);
    expect(get).toHaveBeenCalledWith(path, {
      baseURL: env.apiUrlV2,
      params: { ...params, disposicion: 'inline' },
      responseType: 'blob',
    });
    expect(file.blob).toBeInstanceOf(Blob);
    expect(file.filename).toMatch(/\.pdf$/);
  });

  it('un error del back llega con su mensaje real, aunque venga dentro del blob', async () => {
    const body = new Blob([JSON.stringify({ message: 'El pedido no está pagado' })], { type: 'application/json' });
    const error = new AxiosError('Request failed');
    error.response = { status: 409, data: body, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
    get.mockRejectedValue(error);
    const caught = await downloadPdf({ kind: 'order-recibo', orderId: 'o1' }).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
    expect((caught as ApiError).messages).toEqual(['El pedido no está pagado']);
  });
});
