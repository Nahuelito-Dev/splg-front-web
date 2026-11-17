import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { applyMove, upsertCard } from '../../pages/Fleet/board/boardModel';
import { sampleBoard } from '../../pages/Fleet/board/boardFixtures';

const api = vi.hoisted(() => ({ moveFleetTask: vi.fn() }));
vi.mock('../api/fleet', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

import { boardKey, useMoveFleetTask } from './fleet';

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(boardKey({}), sampleBoard());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useMoveFleetTask(), { wrapper }) };
};

const vars = {
  id: 'f1',
  body: { to: 'in_progress' as const },
  optimistic: (b: ReturnType<typeof sampleBoard>) => applyMove(b, 'f1', 'in_progress', 0),
  settle: upsertCard,
};

describe('useMoveFleetTask', () => {
  it('es optimista y vuelve atrás si el back responde 409', async () => {
    api.moveFleetTask.mockRejectedValueOnce(new ApiError(409, ['La tarea cambió'], 'FLEET_TASK_STALE'));
    const { client, result } = setup();
    act(() => {
      result.current.mutate(vars);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const board = client.getQueryData<ReturnType<typeof sampleBoard>>(boardKey({}));
    expect(board?.columns.forecast.map((c) => c.id)).toEqual(['f1', 'f2']);
    expect(board?.columns.in_progress.map((c) => c.id)).toEqual(['i1']);
    expect(result.current.error).toMatchObject({ status: 409, code: 'FLEET_TASK_STALE' });
  });

  it('con éxito deja la tarjeta que devolvió el back', async () => {
    const saved = { ...sampleBoard().columns.forecast[0], column: 'in_progress', status: 'in_progress', position: 5 };
    api.moveFleetTask.mockResolvedValueOnce(saved);
    const { client, result } = setup();
    act(() => {
      result.current.mutate(vars);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const board = client.getQueryData<ReturnType<typeof sampleBoard>>(boardKey({}));
    expect(board?.columns.in_progress.find((c) => c.id === 'f1')?.position).toBe(5);
  });
});
