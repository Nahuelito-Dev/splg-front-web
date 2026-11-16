import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { RouteSheetNotConfirmableError, RouteSheetShortagesError } from '../../services/api/routeSheets';
import type { RouteSheet, RouteSheetViolation } from '../../services/api/types';
import { mutation, ok } from '../../test/pageTest';
import { planDay, sheet, stop, uuid } from '../../test/routeSheetFixtures';

type Options = { onSuccess?: (result: unknown) => void; onError?: (error: unknown) => void };

const state = vi.hoisted(() => ({
  detail: undefined as unknown,
  sequence: {} as Record<string, unknown>,
  remove: {} as Record<string, unknown>,
  confirmSheet: {} as Record<string, unknown>,
  optimize: {} as Record<string, unknown>,
  cancel: {} as Record<string, unknown>,
  reopen: {} as Record<string, unknown>,
  start: {} as Record<string, unknown>,
  pdf: vi.fn(),
}));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePdfDownload: () => ({ download: state.pdf, pending: false }),
}));
vi.mock('../../services/queries/routeSheets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouteSheet: () => ok(state.detail),
  useLoadSuggestion: () =>
    ok({ sheetId: uuid(1), items: [{ gasCylinderId: uuid(50), type: '10 kg', fullUnits: 3, emptyUnitsBack: 2 }] }),
  useSetRouteSheetSequence: () => state.sequence,
  useRemoveRouteSheetStop: () => state.remove,
  useConfirmRouteSheet: () => state.confirmSheet,
  useOptimizeRouteSheet: () => state.optimize,
  useCancelRouteSheet: () => state.cancel,
  useReopenRouteSheet: () => state.reopen,
  useStartRouteSheet: () => state.start,
  useAddRouteSheetStop: () => mutation(),
  useMoveRouteSheetStop: () => mutation(),
  useUpdateRouteSheet: () => mutation(),
  useCreateRouteSheet: () => mutation(),
}));
vi.mock('../../services/queries/stock', () => ({
  useWarehouses: () =>
    ok([
      { warehouseId: '00000000-0000-4000-8000-000000000900', name: 'Galpón Norte', isDefault: false, address: null },
    ]),
}));
vi.mock('./SheetTracking', () => ({
  SheetTracking: ({ sheet: current }: { sheet: RouteSheet }) => (
    <section aria-label="Seguimiento">{current.id}</section>
  ),
}));
/** Para probar que la hoja no pide los pedidos de a uno: los envases vienen en la parada. */
const ordersApi = vi.hoisted(() => ({ getOrder: vi.fn() }));
vi.mock('../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...ordersApi,
}));
vi.mock('./StopOrderDrawer', () => ({
  StopOrderDrawer: ({ orderId }: { orderId: string | null }) =>
    orderId ? <aside aria-label="Pedido de la parada">{orderId}</aside> : null,
}));
vi.mock('./RouteSheetMap', () => ({
  RouteSheetMap: ({
    stops,
    sheetId,
    onSelect,
  }: {
    stops: { orderId: string; customerName: string | null }[];
    sheetId: string;
    onSelect: (id: string) => void;
  }) => (
    <div role="group" aria-label="Mapa del recorrido" data-n={stops.length} data-sheet={sheetId}>
      {stops.map((s) => (
        <button key={s.orderId} type="button" onClick={() => onSelect(s.orderId)}>
          En el mapa: {s.customerName}
        </button>
      ))}
    </div>
  ),
}));
const notifications = vi.hoisted(() => ({
  confirm: vi.fn(),
  notify: { success: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('../../utils/notifications', () => notifications);

import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SheetView } from './SheetView';

const draw = (current: RouteSheet = sheet()) =>
  render(<SheetView day={planDay({ sheets: [current] })} sheetId={current.id} canWrite onPick={vi.fn()} />);

const stopNames = () =>
  within(screen.getByRole('list', { name: 'Paradas de la hoja' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('b')?.textContent);

/** Una mutación cuyo `mutate` responde con éxito (o error) en el acto. */
const answering = (result: { ok?: unknown; error?: unknown }) =>
  mutation({
    mutate: vi.fn((_: unknown, options?: Options) =>
      'error' in result ? options?.onError?.(result.error) : options?.onSuccess?.(result.ok),
    ),
  });

beforeEach(() => {
  state.detail = undefined;
  state.sequence = mutation();
  state.remove = mutation();
  state.confirmSheet = mutation();
  state.optimize = mutation();
  state.cancel = mutation();
  state.reopen = mutation();
  state.start = mutation();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SheetView: mapa', () => {
  it('el mapa es el de la hoja, fijo debajo de la barra en escritorio, y arriba dice la jornada (no otros km)', () => {
    draw(sheet({ plannedStartAt: '2026-11-14T10:30:00.000Z', totals: { ...sheet().totals, durationMin: 587 } }));
    const map = screen.getByRole('group', { name: 'Mapa del recorrido' });
    expect(map).toHaveAttribute('data-sheet', sheet().id);
    expect(map.closest('.lg\\:sticky')).toHaveClass('lg:top-[76px]');
    expect(screen.getByTestId('sheet-workday')).toHaveTextContent('Jornada 07:30–17:17');
    expect(screen.getByTestId('sheet-workday')).not.toHaveTextContent('km');
  });

  it('tocar una parada en el mapa la resalta en la lista y la lista va hasta ella', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    draw(sheet({ stops: [stop(1), stop(2), stop(3)] }));
    fireEvent.click(screen.getByRole('button', { name: 'En el mapa: Cliente 3' }));
    const row = within(screen.getByRole('list', { name: 'Paradas de la hoja' })).getAllByRole('listitem')[2];
    expect(row).toHaveClass('bg-primary-soft');
    expect(scroll.mock.instances[scroll.mock.instances.length - 1]).toBe(row);
    expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'smooth' });
  });
});

describe('SheetView: pedido de la parada, carga y envases', () => {
  it('tocar una parada en la lista o en el mapa abre su pedido al costado', () => {
    draw(sheet({ stops: [stop(1), stop(2)] }));
    expect(screen.queryByRole('complementary', { name: 'Pedido de la parada' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cliente 2' }));
    expect(screen.getByRole('complementary', { name: 'Pedido de la parada' })).toHaveTextContent(stop(2).orderId);
    fireEvent.click(screen.getByRole('button', { name: 'En el mapa: Cliente 1' }));
    expect(screen.getByRole('complementary', { name: 'Pedido de la parada' })).toHaveTextContent(stop(1).orderId);
  });

  it('la parada dice cuántos envases retira (de la propia parada, sin pedir los pedidos); la hoja, la carga', () => {
    const current = sheet({ stops: [stop(1, { emptiesExpected: 2 }), stop(2)] });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SheetView day={planDay({ sheets: [current] })} sheetId={current.id} canWrite onPick={vi.fn()} />
      </QueryClientProvider>,
    );
    const rows = within(screen.getByRole('list', { name: 'Paradas de la hoja' })).getAllByRole('listitem');
    expect(within(rows[0]).getByTestId('empties-tag')).toHaveTextContent('Retira 2 envases');
    expect(within(rows[1]).queryByTestId('empties-tag')).not.toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Carga del vehículo' })).toBeInTheDocument();
    expect(ordersApi.getOrder).not.toHaveBeenCalled();
  });
});

describe('SheetView: paradas', () => {
  it('muestra las paradas en orden con su hora estimada (hora argentina) y la carga sugerida', () => {
    draw();
    expect(stopNames()).toEqual(['Cliente 1', 'Cliente 2', 'Cliente 3']);
    expect(screen.getAllByTestId('eta').map((e) => e.textContent)).toEqual(['08:00', '09:00', '10:00']);
    expect(screen.getByText('10 kg')).toBeInTheDocument();
  });

  it('bajar con la flecha manda el orden nuevo con la versión, conserva las fijas y avisa', () => {
    const current = sheet({ stops: [stop(1), stop(2, { locked: true }), stop(3)] });
    state.sequence = answering({ ok: current });
    draw(current);
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Cliente 1' }));
    expect(state.sequence.mutate).toHaveBeenCalledWith(
      { sheet: current, orderIds: [uuid(102), uuid(101), uuid(103)], locked: [uuid(102)] },
      expect.anything(),
    );
    expect(notifications.notify.info).toHaveBeenCalledWith('Orden guardado: las horas se recalcularon');
  });

  it('subir la primera no hace nada (está deshabilitada)', () => {
    draw();
    expect(screen.getByRole('button', { name: 'Subir Cliente 1' })).toBeDisabled();
  });

  it('arrastrar una parada sobre otra la mueve a ese lugar', () => {
    draw();
    const items = within(screen.getByRole('list', { name: 'Paradas de la hoja' })).getAllByRole('listitem');
    fireEvent.dragStart(items[0]);
    fireEvent.dragOver(items[2]);
    fireEvent.drop(items[2]);
    expect(state.sequence.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ orderIds: [uuid(102), uuid(103), uuid(101)] }),
      expect.anything(),
    );
  });

  it('fijar y soltar una parada manda el mismo orden con la lista de fijas cambiada', () => {
    const current = sheet({ stops: [stop(1), stop(2, { locked: true }), stop(3)] });
    draw(current);
    fireEvent.click(screen.getByRole('button', { name: 'Fijar Cliente 1' }));
    expect(state.sequence.mutate).toHaveBeenLastCalledWith(
      { sheet: current, orderIds: [uuid(101), uuid(102), uuid(103)], locked: [uuid(102), uuid(101)] },
      expect.anything(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Soltar Cliente 2' }));
    expect(state.sequence.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ locked: [] }), expect.anything());
  });

  it('si otro administrador cambió la hoja (409 de versión) avisa con ese texto', () => {
    state.sequence = answering({
      error: new ApiError(409, ['Otro administrador cambió esta hoja: actualizá'], 'ROUTE_SHEET_VERSION_CONFLICT'),
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Cliente 1' }));
    expect(notifications.notify.warn).toHaveBeenCalledWith('Otro administrador cambió esta hoja');
    expect(notifications.notify.info).not.toHaveBeenCalled();
  });

  it('si la hoja sigue tomada después de los reintentos, pide probar de nuevo', () => {
    state.sequence = answering({ error: new ApiError(409, ['Ocupada'], 'ROUTE_SHEET_BUSY') });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Cliente 1' }));
    expect(notifications.notify.warn).toHaveBeenCalledWith(expect.stringMatching(/probá de nuevo/));
  });

  it('sacar una parada pide confirmación dentro de la página y manda la baja', async () => {
    notifications.confirm.mockResolvedValue(true);
    const current = sheet();
    draw(current);
    fireEvent.click(screen.getByRole('button', { name: 'Sacar Cliente 2 de la hoja' }));
    expect(notifications.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    await vi.waitFor(() =>
      expect(state.remove.mutate).toHaveBeenCalledWith({ sheet: current, orderId: uuid(102) }, expect.anything()),
    );
  });

  it('una hoja confirmada no se edita: sin flechas, con «Reabrir»', () => {
    draw(sheet({ status: 'confirmed', number: 7 }));
    expect(screen.queryByRole('button', { name: /Bajar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar hoja' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    expect(state.reopen.mutate).toHaveBeenCalled();
  });
});

describe('SheetView: acciones de la hoja', () => {
  const late: RouteSheetViolation = {
    code: 'late_stops',
    message: 'Una parada llega fuera de su franja',
    orderIds: [uuid(102)],
  };

  it('confirmar con sólo paradas tarde muestra la regla y permite confirmar aceptándolas', () => {
    const mutate = vi.fn((variables: { acceptLateStops?: boolean }, options?: Options) => {
      if (variables.acceptLateStops) options?.onSuccess?.(sheet({ status: 'confirmed', number: 9 }));
      else options?.onError?.(new RouteSheetNotConfirmableError(['No se puede confirmar'], [late]));
    });
    state.confirmSheet = mutation({ mutate });
    const current = sheet();
    draw(current);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar hoja' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Una parada llega fuera de su franja')).toBeInTheDocument();
    expect(within(dialog).getByText('Cliente 2')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar con paradas fuera de franja' }));
    expect(mutate).toHaveBeenLastCalledWith({ sheet: current, acceptLateStops: true }, expect.anything());
    expect(notifications.notify.success).toHaveBeenCalledWith('Hoja 9 confirmada: quedó lista para el chofer');
  });

  it('si además falta el chofer (u otra regla) no ofrece aceptar las tardías', () => {
    state.confirmSheet = answering({
      error: new RouteSheetNotConfirmableError(
        ['No se puede confirmar'],
        [{ code: 'driver_missing', message: 'La hoja no tiene chofer' }, late],
      ),
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar hoja' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('La hoja no tiene chofer')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /fuera de franja/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Entendido' })).toBeInTheDocument();
  });

  it('ordenar óptimo muestra el antes y el después que calculó el back', () => {
    state.optimize = answering({
      ok: {
        before: { distanceKm: 10.2, durationMin: 120, lateStops: 2 },
        after: { distanceKm: 7.5, durationMin: 95, lateStops: 0 },
        sheet: sheet(),
      },
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar óptimo' }));
    const result = screen.getByRole('region', { name: 'Resultado de ordenar' });
    expect(within(result).getByText('10,2 km')).toBeInTheDocument();
    expect(within(result).getByText('7,5 km')).toBeInTheDocument();
    expect(within(result).getByText('2 h')).toBeInTheDocument();
    expect(notifications.notify.success).toHaveBeenCalledWith('Paradas reordenadas: mirá el antes y el después');
  });

  it('cancelar pide confirmación y manda la baja de la hoja', async () => {
    notifications.confirm.mockResolvedValue(true);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar hoja' }));
    await vi.waitFor(() => expect(state.cancel.mutate).toHaveBeenCalled());
  });

  it('el PDF se pide con el número o como borrador', () => {
    draw(sheet({ number: 12, status: 'confirmed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(state.pdf).toHaveBeenCalledWith({
      kind: 'route-sheet',
      sheetId: uuid(1),
      planDate: '2026-11-14',
      number: 12,
    });
  });
});

describe('SheetView: aviso de depósito sin ubicar', () => {
  const withWarnings = (warnings: RouteSheet['warnings']) => {
    const current = sheet({ warnings });
    state.detail = current;
    return render(
      <MemoryRouter initialEntries={['/route-sheets']}>
        <Routes>
          <Route
            path="/route-sheets"
            element={<SheetView day={planDay({ sheets: [current] })} sheetId={current.id} canWrite onPick={vi.fn()} />}
          />
          <Route path="/stock/warehouses" element={<p>pantalla de galpones</p>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('«Sin depósito de salida ubicado» lleva a Galpones para ubicarlo', () => {
    withWarnings([{ code: 'no_warehouse', message: 'Sin depósito de salida ubicado' }]);
    expect(screen.getByText(/Sin depósito de salida ubicado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Ubicar el depósito' }));
    expect(screen.getByText('pantalla de galpones')).toBeInTheDocument();
  });

  it('los demás avisos no llevan el link', () => {
    withWarnings([{ code: 'late_stops', message: 'Hay paradas fuera de su franja' }]);
    expect(screen.getByText(/Hay paradas fuera de su franja/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ubicar el depósito' })).not.toBeInTheDocument();
  });
});

describe('SheetView: iniciar y seguir la hoja', () => {
  const started = {
    sheetId: uuid(1),
    alreadyStarted: false,
    assignedOrderIds: [uuid(101), uuid(102)],
    droppedOrderIds: [uuid(103)],
    shortages: [],
    truckLoadId: null,
    notifiedCustomers: 2,
  };
  const confirmed = () => sheet({ status: 'confirmed', number: 7 });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('iniciar en nombre del chofer pide confirmación, manda el inicio y avisa los pedidos que ya no estaban', async () => {
    notifications.confirm.mockResolvedValue(true);
    state.start = answering({ ok: started });
    draw(confirmed());
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar viaje en nombre del chofer' }));
    await vi.waitFor(() =>
      expect(state.start.mutate).toHaveBeenCalledWith(
        { sheetId: uuid(1), acknowledgeShortages: undefined },
        expect.anything(),
      ),
    );
    expect(notifications.notify.success).toHaveBeenCalledWith(
      'Hoja 7 en viaje: se les avisó a 2 cliente(s) que su pedido está en camino',
    );
    expect(notifications.notify.warn).toHaveBeenCalledWith(
      '1 pedido(s) ya no estaban disponibles y salieron de la hoja',
    );
  });

  it('si no se confirma, no inicia', async () => {
    notifications.confirm.mockResolvedValue(false);
    draw(confirmed());
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar viaje en nombre del chofer' }));
    await vi.waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    expect(state.start.mutate).not.toHaveBeenCalled();
  });

  it('409 de faltantes: muestra qué falta dentro de la página y «Iniciar igual» reintenta aceptándolos', async () => {
    notifications.confirm.mockResolvedValue(true);
    const shortages = [{ gasCylinderId: uuid(50), type: '10 kg', required: 5, onTruck: 3, missing: 2 }];
    const mutate = vi.fn((variables: { acknowledgeShortages?: boolean }, options?: Options) => {
      if (variables.acknowledgeShortages) options?.onSuccess?.({ ...started, droppedOrderIds: [] });
      else options?.onError?.(new RouteSheetShortagesError(['Faltan garrafas'], shortages));
    });
    state.start = mutation({ mutate });
    draw(confirmed());
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar viaje en nombre del chofer' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('10 kg')).toBeInTheDocument();
    expect(within(dialog).getByText(/faltan 2/)).toBeInTheDocument();
    expect(within(dialog).getByText('La hoja pide 5 llena(s) y el camión lleva 3.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Iniciar igual' }));
    expect(mutate).toHaveBeenLastCalledWith({ sheetId: uuid(1), acknowledgeShortages: true }, expect.anything());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notifications.notify.warn).not.toHaveBeenCalled();
  });

  it('otro 409 al iniciar (vehículo no en uso) se muestra tal cual lo manda el back', async () => {
    notifications.confirm.mockResolvedValue(true);
    const error = new ApiError(409, ['No tenés un vehículo en uso'], 'ROUTE_SHEET_CAR_NOT_IN_USE');
    state.start = answering({ error });
    draw(confirmed());
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar viaje en nombre del chofer' }));
    await vi.waitFor(() => expect(notifications.notify.error).toHaveBeenCalledWith(error));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('una hoja de otro día no se inicia (el botón dice por qué)', () => {
    draw(sheet({ status: 'confirmed', number: 7, planDate: '2026-11-15' }));
    const button = screen.getByRole('button', { name: 'Iniciar viaje en nombre del chofer' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Sólo se inicia el día del reparto');
    fireEvent.click(button);
    expect(notifications.confirm).not.toHaveBeenCalled();
  });

  it('sin permiso de escritura (modo soporte) no se ofrece iniciar', () => {
    render(<SheetView day={planDay({ sheets: [confirmed()] })} sheetId={uuid(1)} canWrite={false} onPick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Iniciar viaje en nombre del chofer' })).not.toBeInTheDocument();
  });

  it('una hoja en reparto o cerrada muestra el seguimiento en lugar de la edición', () => {
    draw(sheet({ status: 'assigned', number: 7 }));
    expect(screen.getByRole('region', { name: 'Seguimiento' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Paradas de la hoja' })).not.toBeInTheDocument();
    cleanup();
    draw(sheet({ status: 'completed', number: 7 }));
    expect(screen.getByRole('region', { name: 'Seguimiento' })).toBeInTheDocument();
  });

  it('una confirmada sigue mostrando el plan', () => {
    draw(confirmed());
    expect(screen.queryByRole('region', { name: 'Seguimiento' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Paradas de la hoja' })).toBeInTheDocument();
  });
});

describe('SheetView: hoja confirmada del chofer', () => {
  it('dice si los pedidos ya se le asignaron al chofer o cuándo se le asignan', () => {
    draw(sheet({ status: 'confirmed', number: 7, assignedAt: '2026-11-14T09:00:00.000Z' }));
    expect(screen.getByTestId('assigned-at')).toHaveTextContent(
      'Pedidos asignados al chofer a las 06:00: espera la carga para iniciar el viaje',
    );
    cleanup();
    draw(sheet({ status: 'confirmed', number: 7, planDate: '2026-11-20' }));
    expect(screen.getByTestId('assigned-at')).toHaveTextContent(
      'Los pedidos se le asignan al chofer al empezar el día del reparto',
    );
  });
});
