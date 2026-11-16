import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSession } from '../../services/api/types';
import { ApiError } from '../../services/api/errors';

const state = vi.hoisted(() => ({
  active: null as SupportSession | null,
  pending: null as SupportSession | null,
}));
const endMutate = vi.fn();
const sync = vi.fn();
const update = vi.fn();
const navigate = vi.fn();
const notify = vi.hoisted(() => ({ success: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks', () => ({ useSupportSession: () => state }));
vi.mock('../../services/queries/supportSessions', () => ({
  useEndSupportSession: () => ({ mutate: endMutate, isPending: false }),
  syncSupportMode: () => sync() as unknown,
}));
vi.mock('../../services/api/supportMode', () => ({
  supportMode: {
    update: (s: unknown) => {
      update(s);
    },
  },
}));
vi.mock('../../utils/notifications', () => ({ notify }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

import { SupportBanner } from './SupportBanner';

const NOW = new Date('2026-11-13T15:00:00.000Z').getTime();
const session = (over: Partial<SupportSession> = {}) =>
  ({
    id: 's-1',
    status: 'active',
    distributorName: 'Gas Norte',
    reason: 'El tablero de despacho no muestra los pedidos de hoy',
    expiresAt: new Date(NOW + 42 * 60_000 + 13_000).toISOString(),
    ...over,
  }) as SupportSession;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  state.active = null;
  state.pending = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('SupportBanner', () => {
  it('sin sesión ni pedido no muestra nada', () => {
    const { container } = render(<SupportBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('activa: empresa, sólo lectura, cuenta regresiva y motivo', () => {
    state.active = session();
    render(<SupportBanner />);
    const band = screen.getByRole('region', { name: 'Modo soporte' });
    expect(band).toHaveTextContent('Modo soporte · Gas Norte');
    expect(band).toHaveTextContent('Sólo lectura');
    expect(band).toHaveTextContent('Vence en 42:13');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(band).toHaveTextContent('Vence en 42:10');
  });

  it('«Salir del modo soporte» cierra la sesión en la API, vuelve al inicio y sale del modo', () => {
    state.active = session();
    render(<SupportBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Salir del modo soporte' }));
    expect(endMutate).toHaveBeenCalledWith('s-1', expect.any(Object));
    const [, callbacks] = endMutate.mock.calls[0] as [string, { onSuccess: () => void }];
    callbacks.onSuccess();
    expect(navigate).toHaveBeenCalledWith('/home');
    expect(update).toHaveBeenCalledWith(null);
    expect(notify.success).toHaveBeenCalledWith('Saliste del modo soporte');
  });

  it('si la API dice que ya había terminado (409), igual sale del modo', () => {
    state.active = session();
    render(<SupportBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Salir del modo soporte' }));
    const [, callbacks] = endMutate.mock.calls[0] as [string, { onError: (e: unknown) => void }];
    callbacks.onError(new ApiError(409, ['La sesión ya terminó'], 'SUPPORT_SESSION_ALREADY_ENDED'));
    expect(update).toHaveBeenCalledWith(null);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('otro error al salir se muestra y no sale', () => {
    state.active = session();
    render(<SupportBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Salir del modo soporte' }));
    const [, callbacks] = endMutate.mock.calls[0] as [string, { onError: (e: unknown) => void }];
    callbacks.onError(new ApiError(500, ['Error']));
    expect(update).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalled();
  });

  it('avisa una vez a los 5 minutos del vencimiento y, al llegar a cero, le pregunta a la API', () => {
    state.active = session({ expiresAt: new Date(NOW + 5 * 60_000 + 2000).toISOString() });
    render(<SupportBanner />);
    expect(notify.warn).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(notify.warn).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(notify.warn).toHaveBeenCalledTimes(1);
    expect(sync).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('pendiente: banda neutra «Esperando aprobación» con «Retirar pedido»', () => {
    state.pending = session({ status: 'pending', expiresAt: null });
    render(<SupportBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('Esperando aprobación de Gas Norte');
    expect(screen.queryByRole('region', { name: 'Modo soporte' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirar pedido' }));
    expect(endMutate).toHaveBeenCalledWith('s-1', expect.any(Object));
  });
});
