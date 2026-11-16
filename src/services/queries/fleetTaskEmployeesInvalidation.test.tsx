import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CancelFleetTaskBody, CloseFleetTaskBody, CreateFleetTaskBody } from '../api/types';
import { cancelFleetTask, closeFleetTask, createFleetTask } from '../api/fleet';
import { useCancelFleetTask, useCloseFleetTask, useCreateFleetTask } from './fleet';
import { queryKeys } from './queryKeys';

vi.mock('../api/fleet', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createFleetTask: vi.fn(),
  closeFleetTask: vi.fn(),
  cancelFleetTask: vi.fn(),
}));

const wrapperWith = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('documentos del personal: refrescan la lista de legajos', () => {
  it.each([
    ['cargar', useCreateFleetTask, createFleetTask, {} as CreateFleetTaskBody],
    ['cerrar', useCloseFleetTask, closeFleetTask, { id: 't', body: {} as CloseFleetTaskBody }],
    ['cancelar', useCancelFleetTask, cancelFleetTask, { id: 't', body: {} as CancelFleetTaskBody }],
  ] as const)('%s un documento invalida flota y legajos', async (_nombre, useHook, api, variables) => {
    vi.mocked(api).mockResolvedValue({} as never);
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useHook(), { wrapper: wrapperWith(client) });
    (result.current.mutate as (v: unknown) => void)(variables);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.fleet.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.employees.all });
  });
});
