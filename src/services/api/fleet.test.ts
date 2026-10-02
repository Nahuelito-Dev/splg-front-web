import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAdmins } from './admins';
import { listFleetTasks } from './fleet';

const get = vi.hoisted(() => vi.fn());

vi.mock('./httpClient', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, http: { get } };
});

describe('listados con filtro del lado del back', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('las tareas se piden por plan y página, y el total sale de X-Total-Count', async () => {
    get.mockResolvedValue({ data: [{ taskId: 't-1' }], headers: { 'x-total-count': '37' } });
    const page = await listFleetTasks({ page: 2, pageSize: 10 }, { planId: 'p-1' });
    expect(get).toHaveBeenCalledWith('/fleet/tasks', { params: { planId: 'p-1', limit: 10, offset: 20 } });
    expect(page.total).toBe(37);
    expect(page.rows).toHaveLength(1);
  });

  it('los administradores se piden por distribuidora', async () => {
    get.mockResolvedValue({ data: [] });
    await listAdmins('d-1');
    expect(get).toHaveBeenCalledWith('/admin', { params: { distributorId: 'd-1' } });
  });
});
