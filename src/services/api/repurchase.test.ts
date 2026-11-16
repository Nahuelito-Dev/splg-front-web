import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCustomerRepurchase,
  getRepurchaseStats,
  listRepurchaseForecast,
  listRepurchaseInvitations,
  runRepurchase,
} from './repurchase';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('./httpClient', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, http };
});

const V2 = { baseURL: expect.stringContaining('/api/v2') as string };

describe('API de recompra anticipada (v2)', () => {
  beforeEach(() => {
    http.get.mockReset().mockResolvedValue({ data: { ok: true } });
    http.post.mockReset().mockResolvedValue({ data: { ok: true } });
  });

  it('las próximas recompras se piden por ventana de días y página', async () => {
    await listRepurchaseForecast({ page: 2, pageSize: 10 }, 30);
    expect(http.get).toHaveBeenCalledWith('/repurchase/forecast', {
      baseURL: expect.stringContaining('/api/v2') as string,
      params: { days: 30, limit: 10, offset: 20 },
    });
  });

  it('la estimación de un cliente se pide por su user_id', async () => {
    await getCustomerRepurchase('u-1');
    expect(http.get).toHaveBeenCalledWith('/repurchase/forecast/customers/u-1', V2);
  });

  it('las invitaciones se piden con el filtro y la página', async () => {
    await listRepurchaseInvitations({ page: 1, pageSize: 5 }, { status: 'accepted' });
    expect(http.get).toHaveBeenCalledWith('/repurchase/invitations', {
      baseURL: expect.stringContaining('/api/v2') as string,
      params: { status: 'accepted', limit: 5, offset: 5 },
    });
    await listRepurchaseInvitations({ page: 0, pageSize: 10 });
    expect(http.get).toHaveBeenLastCalledWith('/repurchase/invitations', {
      baseURL: expect.stringContaining('/api/v2') as string,
      params: { limit: 10, offset: 0 },
    });
  });

  it('las estadísticas se piden sin parámetros (últimos 90 días)', async () => {
    await getRepurchaseStats();
    expect(http.get).toHaveBeenCalledWith('/repurchase/stats', V2);
  });

  it('correr la anticipación manda el dryRun en el cuerpo', async () => {
    await runRepurchase({ dryRun: true });
    expect(http.post).toHaveBeenCalledWith('/repurchase/run', { dryRun: true }, V2);
  });
});
