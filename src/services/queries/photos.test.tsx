import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Link {
  url: string | null;
  expiresAt: string | null;
  requiresAuth: boolean;
}

// Una función común (no `vi.fn`) para devolver promesas rechazadas sin que el espía las deje sin atender.
const calls: [string, string][] = [];
let answers: (() => Promise<Link>)[] = [];
vi.mock('../api/photos', () => ({
  getPhotoLink: (kind: string, id: string) => {
    calls.push([kind, id]);
    const answer = answers.length > 1 ? answers.shift() : answers[0];
    return answer ? answer() : Promise.reject(new Error('sin respuesta'));
  },
}));

import { useRenewablePhoto } from './photos';

const SIGNED_OLD = 'https://splg.s3.amazonaws.com/cars/a.jpg?X-Amz-Signature=viejo';
const SIGNED_NEW = 'https://splg.s3.amazonaws.com/cars/a.jpg?X-Amz-Signature=nuevo';
const SIGNED_THIRD = 'https://splg.s3.amazonaws.com/cars/a.jpg?X-Amz-Signature=tercera';
const link = (url: string | null, expiresAt: string | null = null) => ({ url, expiresAt, requiresAuth: false });
const gives =
  (url: string | null, expiresAt: string | null = null) =>
  () =>
    Promise.resolve(link(url, expiresAt));
const fails = () => Promise.reject(new Error('boom'));

beforeEach(() => {
  calls.length = 0;
  answers = [];
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useRenewablePhoto', () => {
  it('arranca con la URL firmada que mandó el back, sin pedir nada', () => {
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    expect(result.current.src).toBe(SIGNED_OLD);
    expect(calls).toEqual([]);
  });

  it('si la imagen falla (URL vencida) pide una nueva con ?modo=url y la usa', async () => {
    answers = [gives(SIGNED_NEW)];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.src).toBe(SIGNED_NEW));
    expect(calls).toEqual([['car', 'c1']]);
    expect(result.current.failed).toBe(false);
  });

  it('renueva una sola vez por URL: si la nueva también falla, queda como error', async () => {
    answers = [gives(SIGNED_NEW)];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.src).toBe(SIGNED_NEW));
    act(() => result.current.handleError());
    expect(result.current.failed).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('si falla el pedido de la URL nueva, queda como error', async () => {
    answers = [fails];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c2', SIGNED_OLD));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.failed).toBe(true));
  });

  it('reintentar tras el error vuelve a pedir la URL', async () => {
    answers = [fails, gives(SIGNED_NEW)];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.failed).toBe(true));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.src).toBe(SIGNED_NEW));
    expect(result.current.failed).toBe(false);
  });

  it('si el back manda otra photoUrl (subida, cambio o lista refrescada) descarta lo renovado', async () => {
    answers = [gives(SIGNED_NEW)];
    const { result, rerender } = renderHook(({ url }) => useRenewablePhoto('car', 'c1', url), {
      initialProps: { url: SIGNED_OLD as string | null },
    });
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.src).toBe(SIGNED_NEW));
    rerender({ url: SIGNED_THIRD });
    expect(result.current.src).toBe(SIGNED_THIRD);
    rerender({ url: null });
    expect(result.current.src).toBeNull();
  });

  it('antes de ampliar, si el expiresAt de la URL renovada ya pasó, pide otra', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
    answers = [gives(SIGNED_NEW, '2026-10-10T12:05:00Z'), gives(SIGNED_THIRD)];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.src).toBe(SIGNED_NEW));

    act(() => result.current.renewIfExpired());
    expect(calls).toHaveLength(1);

    vi.setSystemTime(new Date('2026-10-10T12:06:00Z'));
    act(() => result.current.renewIfExpired());
    await waitFor(() => expect(result.current.src).toBe(SIGNED_THIRD));
    expect(calls).toHaveLength(2);
  });

  it('si la renovación dice que ya no hay foto (url null), queda en "none" y no en error', async () => {
    answers = [gives(null)];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.none).toBe(true));
    expect(result.current.failed).toBe(false);
    expect(result.current.src).toBeNull();
  });

  it('si la renovación devuelve la misma URL que falló (URL externa muerta), queda como error', async () => {
    const dead = 'https://cdn.example/muerta.png';
    answers = [gives(dead)];
    const { result } = renderHook(() => useRenewablePhoto('incident', 'i1', dead));
    act(() => result.current.handleError());
    await waitFor(() => expect(result.current.failed).toBe(true));
  });

  it('miniatura y ampliada que fallan a la vez comparten un solo pedido', async () => {
    answers = [gives(SIGNED_NEW)];
    const first = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    const second = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => {
      first.result.current.handleError();
      second.result.current.handleError();
    });
    await waitFor(() => expect(first.result.current.src).toBe(SIGNED_NEW));
    await waitFor(() => expect(second.result.current.src).toBe(SIGNED_NEW));
    expect(calls).toHaveLength(1);
  });

  it('dos errores seguidos de la misma imagen mientras se renueva no la marcan como fallida', async () => {
    answers = [gives(SIGNED_NEW)];
    const { result } = renderHook(() => useRenewablePhoto('car', 'c1', SIGNED_OLD));
    act(() => {
      result.current.handleError();
      result.current.handleError();
    });
    await waitFor(() => expect(result.current.src).toBe(SIGNED_NEW));
    expect(result.current.failed).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('con `renewable` en false no pide nada: si la imagen falla queda como error (respaldo)', () => {
    answers = [gives(SIGNED_NEW)];
    const { result } = renderHook(() => useRenewablePhoto('user', 'u1', SIGNED_OLD, false));
    expect(result.current.src).toBe(SIGNED_OLD);
    act(() => result.current.handleError());
    expect(calls).toEqual([]);
    expect(result.current.failed).toBe(true);
  });
});
