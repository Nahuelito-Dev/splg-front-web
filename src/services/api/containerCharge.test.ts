import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import { getContainerCharge, putContainerCharge } from './containerCharge';

beforeEach(() => {
  http.get.mockReset();
  http.put.mockReset();
});

describe('API del cobro de envases (v2)', () => {
  it('lee el interruptor por la v2', async () => {
    http.get.mockResolvedValue({ data: { enabled: false } });
    expect(await getContainerCharge()).toEqual({ enabled: false });
    expect(http.get).toHaveBeenCalledWith('/container-charge', { baseURL: env.apiUrlV2 });
  });

  it('lo guarda con PUT e Idempotency-Key', async () => {
    http.put.mockResolvedValue({ data: { enabled: true } });
    expect(await putContainerCharge({ enabled: true }, 'k-1')).toEqual({ enabled: true });
    expect(http.put).toHaveBeenCalledWith(
      '/container-charge',
      { enabled: true },
      { baseURL: env.apiUrlV2, headers: { 'Idempotency-Key': 'k-1' } },
    );
  });
});
