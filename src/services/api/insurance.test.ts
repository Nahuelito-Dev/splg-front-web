import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import {
  createInsurancePolicy,
  deleteInsurer,
  getCarInsurance,
  listInsurers,
  payInsuranceInstallment,
  uploadInstallmentReceipt,
} from './insurance';

const v2 = { baseURL: env.apiUrlV2 };

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('API de seguros (v2)', () => {
  it('lee el seguro del vehículo por la v2', async () => {
    http.get.mockResolvedValue({ data: { carId: 'c-1', current: null, history: [] } });
    await getCarInsurance('c-1');
    expect(http.get).toHaveBeenCalledWith('/cars/c-1/insurance', v2);
  });

  it('lista las aseguradoras con página desde 1 y búsqueda', async () => {
    http.get.mockResolvedValue({ data: { data: [], total: 0 } });
    await listInsurers({ page: 1, pageSize: 10 }, 'sancor');
    expect(http.get).toHaveBeenCalledWith('/insurers', { ...v2, params: { page: 2, limit: 10, term: 'sancor' } });
  });

  it('la baja de una aseguradora es un DELETE', async () => {
    http.delete.mockResolvedValue({});
    await deleteInsurer('i-1');
    expect(http.delete).toHaveBeenCalledWith('/insurers/i-1', v2);
  });

  it('el alta de póliza lleva Idempotency-Key', async () => {
    http.post.mockResolvedValue({ data: { policyId: 'p-1' } });
    const body = { carId: 'c-1' } as never;
    await createInsurancePolicy(body, 'key-1');
    expect(http.post).toHaveBeenCalledWith('/insurance-policies', body, {
      ...v2,
      headers: { 'Idempotency-Key': 'key-1' },
    });
  });

  it('el comprobante se sube como multipart con el campo file', async () => {
    http.post.mockResolvedValue({ data: { attachmentId: 'a-1', scan: { available: false, data: null } } });
    const file = new File(['x'], 'comprobante.pdf', { type: 'application/pdf' });
    await uploadInstallmentReceipt('q-1', file, 'key-2');
    const [url, form, config] = http.post.mock.calls[0] as [string, FormData, Record<string, unknown>];
    expect(url).toBe('/insurance-installments/q-1/receipt');
    expect(form.get('file')).toBeInstanceOf(File);
    expect(config).toMatchObject({
      ...v2,
      headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': 'key-2' },
    });
  });

  it('el pago manda el cuerpo con Idempotency-Key', async () => {
    http.post.mockResolvedValue({ data: {} });
    const body = { attachmentId: 'a-1', paidAt: '2026-10-28T12:00:00.000Z', amount: 100, cashBoxId: 'b-1' };
    await payInsuranceInstallment('q-1', body, 'key-3');
    expect(http.post).toHaveBeenCalledWith('/insurance-installments/q-1/pay', body, {
      ...v2,
      headers: { 'Idempotency-Key': 'key-3' },
    });
  });
});
