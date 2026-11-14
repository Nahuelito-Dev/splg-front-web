import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, loading, mutation, ok } from '../../test/pageTest';
import { execution, liveStop, planDay, sheet, unassigned, uuid } from '../../test/routeSheetFixtures';

type Options = { onSuccess?: (result: unknown) => void; onError?: (error: unknown) => void };

const state = vi.hoisted(() => ({
  execution: undefined as unknown,
  executionArgs: [] as unknown[],
  remove: {} as Record<string, unknown>,
  add: {} as Record<string, unknown>,
  close: {} as Record<string, unknown>,
  fail: {} as Record<string, unknown>,
  readOnly: false,
  online: true,
  map: vi.fn(),
}));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ readOnly: state.readOnly }),
}));
vi.mock('../../context/useSocketContext', () => ({
  useSocketContext: () => ({ isOnline: state.online, subscribe: () => () => undefined }),
}));
vi.mock('./useRouteSheetLive', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouteSheetLive: () => ({ isOnline: state.online }),
}));
vi.mock('../../services/queries/routeSheets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouteSheetExecution: (...args: unknown[]) => {
    state.executionArgs = args;
    return state.execution;
  },
  useRemoveRouteSheetStop: () => state.remove,
  useAddRouteSheetStop: () => state.add,
  useCloseRouteSheet: () => state.close,
  useFailRouteSheetStop: () => state.fail,
}));
vi.mock('./AwaitingAdmin', () => ({
  AwaitingOrderActions: ({ stop, canWrite }: { stop: { orderId: string }; canWrite: boolean }) =>
    canWrite ? <span data-testid={`decide-${stop.orderId}`}>decidir</span> : null,
}));
vi.mock('./RouteSheetMap', () => ({
  RouteSheetMap: (props: { stops: unknown[]; driver?: unknown }) => {
    state.map(props);
    return <div role="img" aria-label="Mapa del recorrido" />;
  },
}));
const notifications = vi.hoisted(() => ({
  confirm: vi.fn(),
  notify: { success: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('../../utils/notifications', () => notifications);

import { SheetTracking } from './SheetTracking';

const inProgress = sheet({ status: 'assigned', number: 7, version: 4 });

const draw = (canWrite = true, current = inProgress) =>
  render(
    <SheetTracking
      day={planDay({ sheets: [current], unassigned: [unassigned(1)] })}
      sheet={current}
      canWrite={canWrite}
    />,
  );

const answering = (result: { ok?: unknown; error?: unknown }) =>
  mutation({
    mutate: vi.fn((_: unknown, options?: Options) =>
      'error' in result ? options?.onError?.(result.error) : options?.onSuccess?.(result.ok),
    ),
  });

const stopItems = () => within(screen.getByRole('list', { name: 'Avance de las paradas' })).getAllByRole('listitem');

beforeEach(() => {
  state.execution = ok(execution());
  state.remove = mutation();
  state.add = mutation();
  state.close = mutation();
  state.fail = mutation();
  state.readOnly = false;
  state.online = true;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SheetTracking: estado y avance', () => {
  it('muestra el estado, el avance y cada parada con su progreso y su hora vigente contra la prometida', () => {
    draw();
    expect(screen.getByText('En reparto')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Avance de la hoja' })).toHaveAttribute(
      'aria-valuetext',
      '1 de 3 entregadas',
    );
    const [first, second, third] = stopItems();
    expect(within(first).getByText('Entregada', { selector: 'span' })).toBeInTheDocument();
    expect(within(first).getByText('Llegó 08:02')).toBeInTheDocument();
    expect(within(second).getByText('En camino')).toBeInTheDocument();
    // 12:10 vigente contra 12:00 prometida (hora argentina).
    expect(within(second).getByTestId('eta')).toHaveTextContent('09:10');
    expect(within(second).getByText('+10 min · prometida 09:00')).toBeInTheDocument();
    expect(within(third).getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('En vivo')).toBeInTheDocument();
  });

  it('el mapa recibe las paradas activas y la posición del chofer', () => {
    draw();
    const props = (state.map.mock.calls.at(-1) as unknown[] | undefined)?.[0] as { stops: unknown[]; driver: unknown };
    expect(props.stops).toHaveLength(3);
    expect(props.driver).toEqual({ lat: -27.381, lng: -55.931, at: '2026-11-14T12:00:00.000Z' });
    expect(screen.getByTestId('driver-location')).toHaveTextContent('Chofer: posición de las 09:00');
  });

  it('las paradas que salieron van aparte, con el motivo y la nota', () => {
    state.execution = ok(
      execution({
        stops: [
          liveStop(1),
          liveStop(2, {
            sequence: null,
            progress: 'failed',
            removedReason: 'failed_delivery',
            removedNote: 'Portón cerrado',
            removedAt: '2026-11-14T13:00:00.000Z',
          }),
        ],
      }),
    );
    draw();
    expect(stopItems()).toHaveLength(1);
    const gone = screen.getByRole('region', { name: 'Salieron de la hoja' });
    expect(within(gone).getByText(/No se pudo entregar: Portón cerrado · 10:00/)).toBeInTheDocument();
  });

  it('cargando y error tienen su estado; el error se reintenta', () => {
    state.execution = loading();
    draw();
    expect(screen.getByText('Cargando el seguimiento…')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    state.execution = failed(refetch);
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('en curso relee cada minuto con el socket en línea y cada 20 s sin él; una cerrada no relee', () => {
    draw();
    expect(state.executionArgs).toEqual([uuid(1), { refetchInterval: 60_000 }]);
    cleanup();
    state.online = false;
    draw();
    expect(state.executionArgs).toEqual([uuid(1), { refetchInterval: 20_000 }]);
    cleanup();
    draw(true, sheet({ status: 'completed', number: 7 }));
    expect(state.executionArgs).toEqual([uuid(1), { refetchInterval: false }]);
  });

  it('una hoja cerrada muestra el motivo, sin acciones ni posición del chofer', () => {
    state.execution = ok(
      execution({ status: 'completed', closedAt: '2026-11-14T15:00:00.000Z', closeNote: 'Se rompió el camión' }),
    );
    draw(true, sheet({ status: 'completed', number: 7 }));
    expect(screen.getByText('Motivo del cierre: Se rompió el camión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar hoja' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /no pude entregar/ })).not.toBeInTheDocument();
    const props = (state.map.mock.calls.at(-1) as unknown[] | undefined)?.[0] as { driver: unknown };
    expect(props.driver).toBeNull();
  });
});

describe('SheetTracking: sólo lectura', () => {
  it('en modo soporte se ve todo y no hay acciones; se relee cada 20 s', () => {
    state.readOnly = true;
    draw(false);
    expect(screen.getByText('Modo soporte: sólo lectura')).toBeInTheDocument();
    expect(stopItems()).toHaveLength(3);
    for (const name of ['Agregar pedido', 'Cerrar hoja', /no pude entregar/, /Sacar/]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(state.executionArgs).toEqual([uuid(1), { refetchInterval: 20_000 }]);
  });
});

describe('SheetTracking: acciones con la hoja en curso', () => {
  it('sacar una pendiente pide confirmación y manda la versión del seguimiento', async () => {
    notifications.confirm.mockResolvedValue(true);
    draw();
    expect(screen.queryByRole('button', { name: 'Sacar Cliente 2 de la hoja' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sacar Cliente 3 de la hoja' }));
    await vi.waitFor(() =>
      expect(state.remove.mutate).toHaveBeenCalledWith(
        { sheet: { ...inProgress, version: 5 }, orderId: uuid(103) },
        expect.anything(),
      ),
    );
  });

  it('si al sacar cambió la versión, avisa que otro administrador la cambió', async () => {
    notifications.confirm.mockResolvedValue(true);
    state.remove = answering({ error: new ApiError(409, ['Cambió'], 'ROUTE_SHEET_VERSION_CONFLICT') });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Sacar Cliente 3 de la hoja' }));
    await vi.waitFor(() =>
      expect(notifications.notify.warn).toHaveBeenCalledWith('Otro administrador cambió esta hoja'),
    );
  });

  it('agregar un pedido: valida la posición contra lo que falta y manda pedido, posición y versión', async () => {
    state.add = answering({ ok: inProgress });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar pedido' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Posición (opcional)'), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar' }));
    expect(await within(dialog).findByText('Un número entre 1 y 2')).toBeInTheDocument();
    expect(state.add.mutate).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Posición (opcional)'), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar' }));
    await vi.waitFor(() =>
      expect(state.add.mutate).toHaveBeenCalledWith(
        { sheet: { ...inProgress, version: 5 }, orderId: uuid(201), position: 1 },
        expect.anything(),
      ),
    );
    expect(notifications.notify.success).toHaveBeenCalledWith('Suelto 1 quedó en Hoja 7: el chofer recibe el aviso');
  });

  it('agregar: un 409 que no es de versión se muestra dentro del modal', async () => {
    state.add = answering({ error: new ApiError(409, ['El pedido ya no está libre'], 'ORDER_NOT_PLANNABLE') });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar pedido' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El pedido ya no está libre');
  });

  it('cerrar a mano pide el motivo (5 a 280) dentro de la página y lo manda', () => {
    state.close = answering({
      ok: {
        sheetId: uuid(1),
        alreadyClosed: false,
        releasedOrderIds: [uuid(102), uuid(103)],
        rescheduled: [
          { orderId: uuid(102), scheduledDate: '2026-11-16' },
          { orderId: uuid(103), scheduledDate: null },
        ],
      },
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar hoja' }));
    const dialog = screen.getByRole('dialog');
    const reason = within(dialog).getByLabelText(/Motivo del cierre/);
    fireEvent.change(reason, { target: { value: 'abc' } });
    fireEvent.blur(reason);
    expect(within(dialog).getByText('Al menos 5 caracteres')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar hoja' }));
    expect(state.close.mutate).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: '  Se rompió el camión  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar hoja' }));
    expect(state.close.mutate).toHaveBeenCalledWith(
      { sheetId: uuid(1), reason: 'Se rompió el camión' },
      expect.anything(),
    );
    expect(notifications.notify.success).toHaveBeenCalledWith(
      'Hoja cerrada: 1 pedido(s) se reprogramaron para el próximo día hábil y 1 quedaron esperando tu decisión',
    );
  });

  it('cerrar: un 409 (no está en curso) se muestra en el modal', async () => {
    state.close = answering({ error: new ApiError(409, ['La hoja no está en curso'], 'ROUTE_SHEET_NOT_IN_PROGRESS') });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar hoja' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Motivo del cierre/), { target: { value: 'Se rompió el camión' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar hoja' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La hoja no está en curso');
  });

  it('no entregado: «Otro» exige la nota y manda motivo y nota', async () => {
    state.fail = answering({
      ok: { sheetId: uuid(1), orderId: uuid(102), nextOrderId: uuid(103), backToDispatch: true },
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cliente 2: no pude entregar' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'other' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar no entregado' }));
    expect(await within(dialog).findByText('Contá qué pasó')).toBeInTheDocument();
    expect(state.fail.mutate).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Detalle/), { target: { value: 'Portón cerrado' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar no entregado' }));
    await vi.waitFor(() =>
      expect(state.fail.mutate).toHaveBeenCalledWith(
        { sheetId: uuid(1), orderId: uuid(102), body: { reason: 'other', note: 'Portón cerrado' } },
        expect.anything(),
      ),
    );
  });

  it('no entregado: sin motivo no se manda; con motivo de la lista va sin nota', async () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cliente 3: no pude entregar' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar no entregado' }));
    expect(await within(dialog).findByText('Elegí el motivo')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'customer_absent' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar no entregado' }));
    await vi.waitFor(() =>
      expect(state.fail.mutate).toHaveBeenCalledWith(
        { sheetId: uuid(1), orderId: uuid(103), body: { reason: 'customer_absent' } },
        expect.anything(),
      ),
    );
  });

  it('una parada entregada no se puede marcar ni sacar', () => {
    draw();
    expect(screen.queryByRole('button', { name: 'Cliente 1: no pude entregar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sacar Cliente 1 de la hoja' })).not.toBeInTheDocument();
  });
});

describe('SheetTracking: reintentos, espera y pedidos que salieron', () => {
  it('un reintento muestra cuándo falló; una espera vencida en la puerta se marca', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T13:00:00.000Z'));
    state.execution = ok(
      execution({
        stops: [
          liveStop(1, {
            progress: 'on_the_way',
            arrivedAt: '2026-11-14T12:40:00.000Z',
            waitExpiresAt: '2026-11-14T12:50:00.000Z',
          }),
          liveStop(2, {
            failedAttempts: 1,
            lastFailedAt: '2026-11-14T12:10:00.000Z',
            lastFailureNote: 'No atendía',
            slotName: null,
            slotStart: null,
            slotEnd: null,
          }),
          liveStop(3, { progress: 'on_the_way', waitExpiresAt: '2026-11-14T13:05:00.000Z' }),
        ],
      }),
    );
    draw();
    const [first, second, third] = stopItems();
    expect(within(first).getByText('Venció la espera (09:50)')).toBeInTheDocument();
    expect(within(second).getByText('Reintento: no se entregó a las 09:10')).toHaveAttribute('title', 'No atendía');
    expect(within(second).getByText(/Sin franja fija/)).toBeInTheDocument();
    expect(within(third).getByText('Espera hasta 10:05')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('lo reprogramado muestra el día; lo que espera al admin ofrece decidir (salvo en sólo lectura)', () => {
    state.execution = ok(
      execution({
        stops: [
          liveStop(1),
          liveStop(2, {
            sequence: null,
            progress: 'failed',
            removedReason: 'rescheduled',
            rescheduledTo: '2026-11-16',
          }),
          liveStop(3, { sequence: null, progress: 'removed', removedReason: 'admin', awaitingAdmin: true }),
        ],
      }),
    );
    draw();
    const gone = screen.getByRole('region', { name: 'Salieron de la hoja' });
    expect(within(gone).getByText('Se reprogramó para el lunes 16/11, sin franja fija')).toBeInTheDocument();
    expect(within(gone).getByText('Esperando al admin')).toBeInTheDocument();
    expect(within(gone).getByTestId(`decide-${uuid(103)}`)).toBeInTheDocument();
    expect(within(gone).queryByTestId(`decide-${uuid(102)}`)).not.toBeInTheDocument();
    cleanup();
    state.readOnly = true;
    draw(false);
    expect(screen.queryByTestId(`decide-${uuid(103)}`)).not.toBeInTheDocument();
  });

  it('el segundo intento avisa que se reprograma; el resultado dice el día', async () => {
    state.fail = answering({
      ok: {
        sheetId: uuid(1),
        orderId: uuid(103),
        nextOrderId: null,
        attempt: 2,
        outcome: 'rescheduled',
        rescheduledTo: '2026-11-16',
      },
    });
    state.execution = ok(execution({ stops: [liveStop(3, { failedAttempts: 1 })] }));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cliente 3: no pude entregar' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Ya es el segundo intento/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'customer_absent' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar no entregado' }));
    await vi.waitFor(() =>
      expect(notifications.notify.success).toHaveBeenCalledWith(
        'Cliente 3: segundo intento sin entregar. Se reprogramó para el lunes 16/11, sin franja fija',
      ),
    );
  });
});
