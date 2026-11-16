import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPeoplePhotos } from '../api/peoplePhotos';
import { loadPersonPhoto, usePersonPhoto } from './peoplePhotos';

vi.unmock('./peoplePhotos');
vi.mock('../api/peoplePhotos', () => ({ getPeoplePhotos: vi.fn(), PEOPLE_PHOTOS_MAX: 100 }));

const photo = (id: string) => ({ url: `https://s3/${id}`, expiresAt: '2030-01-01T00:00:00.000Z' });

beforeEach(() => {
  vi.mocked(getPeoplePhotos).mockReset();
  vi.mocked(getPeoplePhotos).mockImplementation((body) =>
    Promise.resolve({
      users: Object.fromEntries(body.userIds.map((id) => [id, id === 'sin-foto' ? null : photo(id)])),
      employees: Object.fromEntries((body.employeeIds ?? []).map((id) => [id, photo(id)])),
      deliveries: Object.fromEntries((body.deliveryIds ?? []).map((id) => [id, photo(id)])),
    }),
  );
});

describe('loadPersonPhoto', () => {
  it('junta en una sola llamada lo pedido en la misma ventana, sin repetir ids', async () => {
    const results = await Promise.all([
      loadPersonPhoto({ kind: 'user', id: 'u1' }),
      loadPersonPhoto({ kind: 'user', id: 'u1' }),
      loadPersonPhoto({ kind: 'user', id: 'sin-foto' }),
      loadPersonPhoto({ kind: 'employee', id: 'e1' }),
      loadPersonPhoto({ kind: 'delivery', id: 'd1' }),
    ]);
    expect(getPeoplePhotos).toHaveBeenCalledTimes(1);
    expect(getPeoplePhotos).toHaveBeenCalledWith({
      userIds: ['u1', 'sin-foto'],
      employeeIds: ['e1'],
      deliveryIds: ['d1'],
    });
    expect(results.map((r) => r?.url ?? null)).toEqual([
      'https://s3/u1',
      'https://s3/u1',
      null,
      'https://s3/e1',
      'https://s3/d1',
    ]);
  });

  it('parte en pedidos de 100 cuando hay más', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `u${i}`);
    await Promise.all(ids.map((id) => loadPersonPhoto({ kind: 'user', id })));
    expect(getPeoplePhotos).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getPeoplePhotos).mock.calls[0][0].userIds).toHaveLength(100);
  });

  it('si la llamada falla, rechaza a todos los que esperaban', async () => {
    vi.mocked(getPeoplePhotos).mockRejectedValueOnce(new Error('caído'));
    const results = await Promise.allSettled([
      loadPersonPhoto({ kind: 'user', id: 'a' }),
      loadPersonPhoto({ kind: 'user', id: 'b' }),
    ]);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });
});

describe('usePersonPhoto', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );

  it('devuelve la foto firmada de la persona', async () => {
    const { result } = renderHook(() => usePersonPhoto({ kind: 'user', id: 'u9' }), { wrapper });
    await waitFor(() => expect(result.current.data?.url).toBe('https://s3/u9'));
  });

  it('sin referencia no pide nada', () => {
    renderHook(() => usePersonPhoto(null), { wrapper });
    expect(getPeoplePhotos).not.toHaveBeenCalled();
  });
});
