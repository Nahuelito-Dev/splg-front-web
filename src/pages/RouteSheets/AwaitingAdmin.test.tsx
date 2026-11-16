import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { mutation, ok } from '../../test/pageTest';
import { execution, liveStop, sheet, uuid } from '../../test/routeSheetFixtures';

type Options = { onSuccess?: (result: unknown) => void; onError?: (error: unknown) => void };

const state = vi.hoisted(() => ({
  executions: [] as unknown[],
  executionIds: [] as string[],
  reschedule: {} as Record<string, unknown>,
  cancel: {} as Record<string, unknown>,
}));
vi.mock('../../services/queries/routeSheets', () => ({
  useRouteSheetExecutions: (ids: string[]) => {
    state.executionIds = ids;
    return state.executions;
  },
  useRescheduleAwaitingOrder: () => state.reschedule,
  useCancelAwaitingOrder: () => state.cancel,
}));
const notifications = vi.hoisted(() => ({ notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../utils/notifications', () => notifications);

import { AwaitingAdminCard } from './AwaitingAdmin';

const answering = (result: { ok?: unknown; error?: unknown }) =>
  mutation({
    mutate: vi.fn((_: unknown, options?: Options) =>
      'error' in result ? options?.onError?.(result.error) : options?.onSuccess?.(result.ok),
    ),
  });

const waiting = liveStop(3, {
  sequence: null,
  progress: 'removed',
  removedReason: 'admin',
  removedAt: '2026-11-14T13:00:00.000Z',
  awaitingAdmin: true,
});
const tracked = sheet({ status: 'assigned', number: 7 });

const draw = (canWrite = true, onOpen = vi.fn()) =>
  render(
    <AwaitingAdminCard
      sheets={[sheet({ id: uuid(2), status: 'draft' }), tracked]}
      canWrite={canWrite}
      onOpen={onOpen}
    />,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  // La 2 salió pero el sistema la reprogramó solo: no espera al admin.
  const rescheduled = liveStop(2, {
    sequence: null,
    progress: 'failed',
    removedReason: 'rescheduled',
    rescheduledTo: '2026-11-16',
  });
  state.executions = [ok(execution({ stops: [liveStop(1), rescheduled, waiting] }))];
  state.reschedule = mutation();
  state.cancel = mutation();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('AwaitingAdminCard', () => {
  it('lee sólo las hojas en curso o cerradas y lista los pedidos que esperan, con el motivo y la hoja', () => {
    const onOpen = vi.fn();
    draw(true, onOpen);
    expect(state.executionIds).toEqual([uuid(1)]);
    const list = screen.getByRole('list', { name: 'Pedidos esperando al admin' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Cliente 3')).toBeInTheDocument();
    expect(within(list).getByText(/La sacó un administrador · 10:00/)).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: 'Hoja 7' }));
    expect(onOpen).toHaveBeenCalledWith(uuid(1));
  });

  it('sin hojas en la calle no se muestra; sin pedidos en espera, lo dice', () => {
    render(<AwaitingAdminCard sheets={[sheet()]} canWrite onOpen={vi.fn()} />);
    expect(screen.queryByText(/Esperando al admin/)).not.toBeInTheDocument();
    cleanup();
    state.executions = [ok(execution())];
    draw();
    expect(screen.getByText('No hay pedidos esperando una decisión.')).toBeInTheDocument();
  });

  it('cambiar la fecha valida el día y la manda', async () => {
    state.reschedule = answering({ ok: {} });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la fecha' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Día de entrega'), { target: { value: '2026-11-10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cambiar la fecha' }));
    expect(await within(dialog).findByText('No puede ser un día pasado')).toBeInTheDocument();
    expect(state.reschedule.mutate).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Día de entrega'), { target: { value: '2026-11-16' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cambiar la fecha' }));
    await vi.waitFor(() =>
      expect(state.reschedule.mutate).toHaveBeenCalledWith(
        { orderId: uuid(103), scheduledDate: '2026-11-16' },
        expect.anything(),
      ),
    );
    expect(notifications.notify.success).toHaveBeenCalledWith('Cliente 3: quedó para el lunes 16/11');
  });

  it('un 409 al cambiar la fecha (cupo, pedido tomado) se muestra en el modal', async () => {
    state.reschedule = answering({ error: new ApiError(409, ['No hay cupo ese día'], 'SLOT_FULL') });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la fecha' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Día de entrega'), { target: { value: '2026-11-16' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cambiar la fecha' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No hay cupo ese día');
  });

  it('cancelar pide el motivo y lo manda', () => {
    state.cancel = answering({ ok: {} });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar el pedido' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar el pedido' }));
    expect(state.cancel.mutate).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Motivo de la cancelación/), {
      target: { value: 'El cliente ya no lo quiere' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar el pedido' }));
    expect(state.cancel.mutate).toHaveBeenCalledWith(
      { orderId: uuid(103), reason: 'El cliente ya no lo quiere' },
      expect.anything(),
    );
    expect(notifications.notify.success).toHaveBeenCalledWith('Cliente 3: pedido cancelado');
  });

  it('sin permiso (modo soporte) se ve la lista sin acciones', () => {
    draw(false);
    expect(screen.getByText('Cliente 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar la fecha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar el pedido' })).not.toBeInTheDocument();
  });
});
