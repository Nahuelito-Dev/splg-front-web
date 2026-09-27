import type { AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../store/store', () => ({ store: { dispatch: vi.fn() } }));
vi.mock('../../store/auth/thunks', () => ({ startLogOut: vi.fn() }));

const { toPage, toQuery } = await import('./httpClient');

const response = (data: number[], headers: Record<string, string> = {}) =>
  ({ data, headers }) as unknown as AxiosResponse<number[]>;

describe('paginado', () => {
  it('lee el total de X-Total-Count', () => {
    expect(toPage(response([1, 2], { 'x-total-count': '231' }))).toEqual({ rows: [1, 2], total: 231 });
  });

  it('sin la cabecera, el total es lo que vino (nunca un número inventado)', () => {
    expect(toPage(response([1, 2, 3])).total).toBe(3);
  });

  it('página y tamaño pasan a limit/offset', () => {
    expect(toQuery({ page: 2, pageSize: 25 })).toEqual({ limit: 25, offset: 50 });
  });
});
