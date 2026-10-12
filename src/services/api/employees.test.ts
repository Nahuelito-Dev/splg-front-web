import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', () => ({ http }));

import type { ApiError } from './errors';
import { deleteJobPosition, updateJobPosition } from './employees';

const conflict = (message: string) =>
  new AxiosError('x', 'E', undefined, undefined, { status: 409, data: { message } } as never);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('errores de puestos', () => {
  it('el 409 por legajos no expone nombres de campos y dice qué hacer', async () => {
    http.delete.mockRejectedValue(
      conflict(
        'El puesto "Chofer" figura en 3 legajo(s), también egresados: desactivalo (isActive=false) en vez de eliminarlo',
      ),
    );
    const error = (await deleteJobPosition('p-1').catch((e: unknown) => e)) as ApiError;
    expect(error.messages[0]).not.toContain('isActive');
    expect(error.messages[0]).toMatch(/Dalo de baja/);
  });

  it('el 409 del último puesto activo se explica', async () => {
    http.patch.mockRejectedValue(conflict('"Chofer" es el último puesto activo de categoría driver: creá otro antes'));
    const error = (await updateJobPosition('p-1', { isActive: false }).catch((e: unknown) => e)) as ApiError;
    expect(error.messages[0]).toMatch(/último puesto activo de su categoría/);
  });

  it('un error que no es 409 pasa tal cual', async () => {
    const boom = new AxiosError('x', 'E', undefined, undefined, { status: 500, data: { message: 'x' } } as never);
    http.delete.mockRejectedValue(boom);
    await expect(deleteJobPosition('p-1')).rejects.toBe(boom);
  });
});
