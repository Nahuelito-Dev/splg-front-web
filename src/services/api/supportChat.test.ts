import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import { ticketSummary } from '../../test/chatFixtures';
import { listCompanyTicketsBy, listPlatformTicketsBy, matchesTicket, mergeByRecent, statusesOf } from './supportChat';

beforeEach(() => {
  http.get.mockReset();
});

const t = (id: string, updatedAt: string, over = {}) => ticketSummary({ id, updatedAt, ...over });

describe('filtros por estado de los tickets', () => {
  it('«Activos» son nuevos, en curso y esperando a la empresa; «Todos», sin filtro', () => {
    expect(statusesOf('active')).toEqual(['new', 'open', 'waiting_company']);
    expect(statusesOf('closed')).toEqual(['closed']);
    expect(statusesOf('all')).toBeNull();
  });

  it('junta listados ordenados por la API en uno, sin repetir, y corta la página', () => {
    const merged = mergeByRecent(
      [
        { items: [t('a', '2026-11-14T10:00:00Z'), t('c', '2026-11-12T10:00:00Z')], total: 2 },
        { items: [t('b', '2026-11-13T10:00:00Z'), t('a', '2026-11-14T10:00:00Z')], total: 5 },
      ],
      1,
      2,
    );
    expect(merged.items.map((x) => x.id)).toEqual(['b', 'c']);
    expect(merged.total).toBe(7);
  });

  it('busca por número (con o sin T-) o por asunto', () => {
    const x = ticketSummary({ number: 'T-000123', subject: 'Factura de octubre' });
    expect(matchesTicket(x, 'T-000123')).toBe(true);
    expect(matchesTicket(x, '123')).toBe(true);
    expect(matchesTicket(x, '12')).toBe(false);
    expect(matchesTicket(x, 'octubre')).toBe(true);
  });

  it('la empresa con «Activos» pide sus tres estados a la API y los junta', async () => {
    http.get.mockImplementation((_url: string, config: { params: { status?: string } }) =>
      Promise.resolve({ data: { items: [t(config.params.status ?? 'x', '2026-11-14T10:00:00Z')], total: 1 } }),
    );
    const page = await listCompanyTicketsBy({ group: 'active', limit: 10, offset: 0 });
    const statuses = http.get.mock.calls.map(([, config]) => (config as { params: { status?: string } }).params.status);
    expect(statuses.sort()).toEqual(['new', 'open', 'waiting_company']);
    expect(page.total).toBe(3);
  });

  it('la empresa con «Cerrados» o «Todos» pide una sola vez (la API filtra o devuelve todo)', async () => {
    http.get.mockResolvedValue({ data: { items: [], total: 0 } });
    await listCompanyTicketsBy({ group: 'closed', limit: 10, offset: 20 });
    await listCompanyTicketsBy({ group: 'all', limit: 10, offset: 0 });
    expect(http.get.mock.calls.map(([, c]) => (c as { params: object }).params)).toEqual([
      { limit: 10, offset: 20, status: 'closed' },
      { limit: 10, offset: 0, status: undefined },
    ]);
  });

  it('la búsqueda de la empresa filtra por número lo que trae la API', async () => {
    http.get.mockResolvedValue({
      data: {
        items: [t('a', '2026-11-14T10:00:00Z', { number: 'T-000009' }), t('b', '2026-11-13T10:00:00Z')],
        total: 2,
      },
    });
    const page = await listCompanyTicketsBy({ group: 'all', q: 'T-9', limit: 10, offset: 0 });
    expect(page.items.map((x) => x.id)).toEqual(['a']);
    expect(page.total).toBe(1);
  });

  it('la plataforma con «Cerrados» le pasa el estado a la API con el resto de los filtros', async () => {
    http.get.mockResolvedValue({ data: { items: [], total: 0, counts: {} } });
    await listPlatformTicketsBy({ group: 'closed', q: 'T-1', limit: 25, offset: 0 });
    expect(http.get).toHaveBeenCalledWith(
      '/platform/tickets',
      expect.objectContaining({ params: { q: 'T-1', status: 'closed', limit: 25, offset: 0 } }),
    );
  });
});
