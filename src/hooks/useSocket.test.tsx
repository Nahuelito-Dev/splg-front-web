import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  return {
    listeners,
    socket: {
      connected: false,
      auth: {},
      on: (event: string, handler: (...args: unknown[]) => void) => {
        listeners.set(event, [...(listeners.get(event) ?? []), handler]);
      },
      off: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    fire: (event: string, ...args: unknown[]) => listeners.get(event)?.forEach((handler) => handler(...args)),
  };
});

vi.mock('socket.io-client', () => ({ io: () => fake.socket }));

import { useSocket } from './useSocket';

afterEach(() => {
  fake.listeners.clear();
  vi.clearAllMocks();
});

describe('useSocket: cortes del servidor', () => {
  it('con el token vencido vuelve a conectar (con un token nuevo)', () => {
    renderHook(() => useSocket('/admin'));
    fake.fire('server:session-expired', {});
    fake.fire('disconnect', 'io server disconnect');
    expect(fake.socket.connect).toHaveBeenCalledTimes(1);
  });

  it('con el acceso revocado no reconecta', () => {
    renderHook(() => useSocket('/admin'));
    fake.fire('server:access-revoked', { motivo: 'bloqueo' });
    fake.fire('disconnect', 'io server disconnect');
    expect(fake.socket.connect).not.toHaveBeenCalled();
  });

  it('un corte del servidor sin aviso (handshake rechazado) no reconecta en bucle', () => {
    renderHook(() => useSocket('/admin'));
    fake.fire('server:session-expired', {});
    fake.fire('disconnect', 'io server disconnect');
    fake.fire('disconnect', 'io server disconnect');
    expect(fake.socket.connect).toHaveBeenCalledTimes(1);
  });
});
