import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, mutation, ok } from '../../test/pageTest';
import { uuid } from '../../test/routeSheetFixtures';

type Options = { onSuccess?: (result: unknown) => void; onError?: (error: unknown) => void };

const state = vi.hoisted(() => ({
  list: undefined as unknown,
  create: {} as Record<string, unknown>,
  remove: {} as Record<string, unknown>,
}));
vi.mock('../../services/queries/routeSheets', () => ({
  useRoutePlanningHolidays: () => state.list,
  useCreateRoutePlanningHoliday: () => state.create,
  useDeleteRoutePlanningHoliday: () => state.remove,
}));
const notifications = vi.hoisted(() => ({
  confirm: vi.fn(),
  notify: { success: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('../../utils/notifications', () => notifications);

import { HolidaysModal } from './HolidaysModal';

const holiday = {
  holidayId: uuid(70),
  date: '2026-11-23',
  description: 'Día de la Soberanía',
  createdAt: '2026-11-14T12:00:00.000Z',
};

const answering = (result: { ok?: unknown; error?: unknown }) =>
  mutation({
    mutate: vi.fn((_: unknown, options?: Options) =>
      'error' in result ? options?.onError?.(result.error) : options?.onSuccess?.(result.ok),
    ),
  });

const fill = (date: string, description: string) => {
  fireEvent.change(screen.getByLabelText('Día'), { target: { value: date } });
  fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: description } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  state.list = ok([holiday]);
  state.create = mutation();
  state.remove = mutation();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('HolidaysModal', () => {
  it('lista los feriados con su día y descripción', () => {
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Feriados cargados' });
    expect(within(list).getByText('lunes 23/11')).toBeInTheDocument();
    expect(within(list).getByText('Día de la Soberanía')).toBeInTheDocument();
  });

  it('valida el día (no pasado) y la descripción (2 a 120) antes de mandar', async () => {
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    fill('2026-11-13', 'x');
    expect(await screen.findByText('No puede ser un día pasado')).toBeInTheDocument();
    expect(screen.getByText('Al menos 2 caracteres')).toBeInTheDocument();
    expect(state.create.mutate).not.toHaveBeenCalled();
  });

  it('manda el feriado y avisa', async () => {
    state.create = answering({ ok: { ...holiday, date: '2026-12-08' } });
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    fill('2026-12-08', '  Inmaculada Concepción ');
    await vi.waitFor(() =>
      expect(state.create.mutate).toHaveBeenCalledWith(
        { date: '2026-12-08', description: 'Inmaculada Concepción' },
        expect.anything(),
      ),
    );
    expect(notifications.notify.success).toHaveBeenCalledWith('Feriado cargado: el martes 08/12 no se reparte');
  });

  it('409 ya cargado y 409 día pasado se muestran en el campo del día', async () => {
    state.create = answering({ error: new ApiError(409, ['Ya existe'], 'ROUTE_HOLIDAY_ALREADY_EXISTS') });
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    fill('2026-11-23', 'Repetido');
    expect(await screen.findByText('Ese día ya está cargado como feriado')).toBeInTheDocument();
    cleanup();
    state.create = answering({ error: new ApiError(409, ['Pasado'], 'ROUTE_HOLIDAY_DATE_PAST') });
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    fill('2026-11-14', 'Hoy');
    expect(await screen.findByText('No se carga un feriado en un día pasado')).toBeInTheDocument();
  });

  it('quitar pide confirmación y manda la baja', async () => {
    notifications.confirm.mockResolvedValue(true);
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el feriado del lunes 23/11' }));
    await vi.waitFor(() => expect(state.remove.mutate).toHaveBeenCalledWith(uuid(70), expect.anything()));
  });

  it('sin permiso (modo soporte) sólo se lee', () => {
    render(<HolidaysModal canWrite={false} writeHint="Modo soporte: sólo lectura" onClose={vi.fn()} />);
    expect(screen.getByText('Modo soporte: sólo lectura')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument();
  });

  it('un error al leer se muestra con reintento; sin feriados, el vacío', () => {
    const refetch = vi.fn();
    state.list = failed(refetch);
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
    cleanup();
    state.list = ok([]);
    render(<HolidaysModal canWrite onClose={vi.fn()} />);
    expect(screen.getByText('No hay feriados cargados de hoy en adelante.')).toBeInTheDocument();
  });
});
