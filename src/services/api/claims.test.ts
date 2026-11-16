import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { listOrderClaims } from './claims';

beforeEach(() => http.get.mockReset());

describe('API de reclamos', () => {
  it('los reclamos de un pedido se piden filtrados por el back (`orderId`), no se filtran en el panel', async () => {
    http.get.mockResolvedValue({ data: [{ claim_id: 'c-1' }] });
    expect(await listOrderClaims('o-1')).toEqual([{ claim_id: 'c-1' }]);
    expect(http.get).toHaveBeenCalledWith('/claims', { params: { orderId: 'o-1' } });
  });
});
