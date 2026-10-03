import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../api/types';

// Una función común (no `vi.fn`) para poder devolver promesas rechazadas sin que el espía las deje sin atender.
const calls: string[] = [];
let respond: (id: string) => Promise<User> = () => Promise.reject(new Error('sin respuesta'));
vi.mock('../api/users', () => ({
  getUser: (id: string) => {
    calls.push(id);
    return respond(id);
  },
}));

import { useUserNames } from './userNames';

const makeWrapper = () => {
  const client = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('useUserNames', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('pide una sola vez cada id distinto, aunque se repita en la lista', async () => {
    respond = (id) => Promise.resolve({ user_id: id, full_name: `Nombre ${id}` } as User);
    const { result } = renderHook(() => useUserNames(['a', 'b', 'a', null, undefined, 'a']), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls.sort()).toEqual(['a', 'b']);
    expect(result.current.nameOf('a')).toBe('Nombre a');
    expect(result.current.nameOf('b')).toBe('Nombre b');
    expect(result.current.nameOf(null)).toBeNull();
  });

  it('si la API no devuelve la cuenta, el nombre es null y no se queda cargando', async () => {
    respond = () => Promise.reject(new Error('404'));
    const { result } = renderHook(() => useUserNames(['x']), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nameOf('x')).toBeNull();
  });
});
