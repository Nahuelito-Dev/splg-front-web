import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import { getBankDetails, putBankDetails } from './bankDetails';
import { listOrderTransferReceipts } from './orders';

beforeEach(() => {
  http.get.mockReset();
  http.put.mockReset();
});

describe('API de datos bancarios y comprobantes (v2)', () => {
  it('lee los datos bancarios de la distribuidora por la v2', async () => {
    http.get.mockResolvedValue({ data: { cbu: null, alias: 'a.b.c.d', holder: null } });
    expect(await getBankDetails()).toEqual({ cbu: null, alias: 'a.b.c.d', holder: null });
    expect(http.get).toHaveBeenCalledWith('/distributor/bank-details', { baseURL: env.apiUrlV2 });
  });

  it('guarda los datos con PUT y devuelve lo que guardó el back', async () => {
    const body = { cbu: '0170099220000067797370', alias: null, holder: 'Demo S.A.' } as never;
    http.put.mockResolvedValue({ data: body });
    expect(await putBankDetails(body)).toEqual(body);
    expect(http.put).toHaveBeenCalledWith('/distributor/bank-details', body, { baseURL: env.apiUrlV2 });
  });

  it('pide los comprobantes del pedido a la v2', async () => {
    http.get.mockResolvedValue({ data: [{ attachmentId: 'a-1' }] });
    expect(await listOrderTransferReceipts('o-1')).toEqual([{ attachmentId: 'a-1' }]);
    expect(http.get).toHaveBeenCalledWith('/orders/o-1/transfer-receipt', { baseURL: env.apiUrlV2 });
  });
});
