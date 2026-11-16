import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { env } from '../../config/env';
import { getChatMetrics, getPlatformChatMetrics } from './chatMetrics';

const V2 = { baseURL: env.apiUrlV2 };

beforeEach(() => {
  http.get.mockReset().mockResolvedValue({ data: { ok: true } });
});

describe('métricas del chat (v2)', () => {
  it('las de la empresa en /v2/chat/metrics, con el período y el canal', async () => {
    await expect(getChatMetrics({ from: '2026-11-01', to: '2026-11-16', channel: 'staff_driver' })).resolves.toEqual({
      ok: true,
    });
    expect(http.get).toHaveBeenCalledWith('/chat/metrics', {
      ...V2,
      params: { from: '2026-11-01', to: '2026-11-16', channel: 'staff_driver' },
    });
  });

  it('sin período ni canal no manda nada (la API usa los últimos 30 días y los dos canales)', async () => {
    await getChatMetrics({ from: '', to: undefined, channel: undefined });
    expect(http.get).toHaveBeenCalledWith('/chat/metrics', { ...V2, params: {} });
  });

  it('las del soporte en /v2/platform/chat/metrics, con la empresa si se eligió', async () => {
    await getPlatformChatMetrics({ distributorId: 'd-1' });
    expect(http.get).toHaveBeenCalledWith('/platform/chat/metrics', { ...V2, params: { distributorId: 'd-1' } });
    await getPlatformChatMetrics({ distributorId: '' });
    expect(http.get).toHaveBeenLastCalledWith('/platform/chat/metrics', { ...V2, params: {} });
  });
});
