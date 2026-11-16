import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSession } from './types';

const clear = vi.fn();
const warn = vi.fn();
const info = vi.fn();
vi.mock('../queries/queryClient', () => ({ queryClient: { clear: () => void clear() } }));
vi.mock('../../utils/notifications', () => ({
  notify: {
    warn: (m: string) => {
      warn(m);
    },
    info: (m: string) => {
      info(m);
    },
  },
}));

import { SUPPORT_ENDED_MESSAGE, supportMode } from './supportMode';

const session = (status: SupportSession['status'], id = 's-1') =>
  ({ id, status, distributorName: 'Gas Norte' }) as SupportSession;

beforeEach(() => {
  supportMode.reset();
  clear.mockReset();
  warn.mockReset();
  info.mockReset();
});

describe('supportMode', () => {
  it('al entrar a una sesión activa vacía la caché y la sesión viaja como activa', () => {
    supportMode.update(null);
    supportMode.update(session('active'));
    expect(supportMode.activeId()).toBe('s-1');
    expect(clear).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('Modo soporte en Gas Norte: sólo lectura');
  });

  it('al recargar con una sesión ya activa no avisa de nuevo (pero igual arranca sin caché de otro lado)', () => {
    supportMode.update(session('active'));
    expect(info).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('un pedido pendiente no es una sesión: no viaja ni vacía la caché', () => {
    supportMode.update(null);
    supportMode.update(session('pending'));
    expect(supportMode.activeId()).toBeNull();
    expect(clear).not.toHaveBeenCalled();
  });

  it('al salir vacía la caché; sólo avisa si terminó sin que el usuario la cerrara', () => {
    supportMode.update(session('active'));
    clear.mockReset();
    supportMode.update(null);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();

    supportMode.update(session('active'));
    supportMode.update(null, SUPPORT_ENDED_MESSAGE);
    expect(warn).toHaveBeenCalledWith(SUPPORT_ENDED_MESSAGE);
  });

  it('la misma sesión que sigue activa no vacía la caché en cada sondeo', () => {
    supportMode.update(session('active'));
    clear.mockReset();
    supportMode.update(session('active'));
    supportMode.update(session('active'));
    expect(clear).not.toHaveBeenCalled();
  });

  it('endedByApi sale sólo si es la sesión activa', () => {
    supportMode.update(session('active'));
    supportMode.endedByApi('otra');
    expect(supportMode.activeId()).toBe('s-1');
    supportMode.endedByApi('s-1');
    expect(supportMode.activeId()).toBeNull();
    expect(warn).toHaveBeenCalledWith(SUPPORT_ENDED_MESSAGE);
  });

  it('avisa a quien escucha', () => {
    const listener = vi.fn();
    const unsubscribe = supportMode.subscribe(listener);
    supportMode.update(session('pending'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    supportMode.update(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
