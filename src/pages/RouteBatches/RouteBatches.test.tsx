import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  needsDistributor: false,
  canWrite: true,
  list: vi.fn(),
  detail: vi.fn(),
  settings: vi.fn(),
  run: {} as Record<string, unknown>,
  dissolve: {} as Record<string, unknown>,
}));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: state.needsDistributor,
    canWrite: state.canWrite && !state.needsDistributor,
    writeHint: undefined,
  }),
}));
vi.mock('../../services/queries/routeBatches', () => ({
  useRouteBatches: (...args: unknown[]) => state.list(...args) as unknown,
  useRouteBatch: (...args: unknown[]) => state.detail(...args) as unknown,
  useRouteBatchSettings: (...args: unknown[]) => state.settings(...args) as unknown,
  useRunRouteBatches: () => state.run,
  useDissolveRouteBatch: () => state.dissolve,
  useUpdateRouteBatchSettings: () => mutation(),
}));
vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
vi.mock('./RouteBatchMap', () => ({
  RouteBatchMap: ({ points, label }: { points: unknown[]; label: string }) => (
    <div role="img" aria-label={label} data-points={points.length} />
  ),
}));
const notifications = vi.hoisted(() => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../utils/notifications', () => notifications);

import { RouteBatches } from './RouteBatches';

const stop = (sequence: number, street: string, over: Record<string, unknown> = {}) => ({
  orderId: `00000000-0000-4000-8000-00000000000${sequence}`,
  sequence,
  active: true,
  etaAt: `2026-11-03T11:${sequence}0:00.000Z`,
  legDistanceKm: sequence === 1 ? 0 : 1.25,
  weightKg: 10 * sequence,
  scheduledDate: '2026-11-03',
  slot: { name: 'Mañana', startTime: '08:00:00', endTime: '12:00:00' },
  address: {
    street,
    city: 'Posadas',
    floor: null,
    apartment: null,
    formattedAddress: null,
    latitude: -27.38 - sequence / 1000,
    longitude: -55.93,
  },
  customerName: 'Cliente Demo',
  paymentMethod: 'cash',
  totalAmount: 15000,
  orderStatus: 'pending',
  items: [{ name: 'Garrafa 10kg', quantity: sequence }],
  ...over,
});

const offer = (status: string, over: Record<string, unknown> = {}) => ({
  offerId: `of-${status}`,
  deliveryId: 'dl-1',
  driverName: 'Ramón Villalba',
  status,
  expiresAt: '2026-11-01T15:01:00.000Z',
  respondedAt: status === 'pending' ? null : '2026-11-01T15:00:30.000Z',
  ...over,
});

const BATCH = {
  batchId: '11111111-1111-4111-8111-1111111aaa01',
  status: 'offered',
  totalWeightKg: 25,
  createdAt: '2026-11-01T15:00:00.000Z',
  closedAt: null,
  closeReason: null,
  driver: null,
  currentOffer: offer('pending'),
  offers: [offer('pending')],
  stops: [stop(2, 'Bolívar 1617'), stop(1, 'Jujuy 571')],
};

const COUNTS = { forming: 0, offered: 1, assigned: 2, dissolved: 3, completed: 4 };

const setup = (over: { list?: unknown; detail?: unknown } = {}) => {
  state.list.mockReturnValue(over.list ?? ok({ data: [BATCH], total: 1, counts: COUNTS }));
  state.detail.mockReturnValue(over.detail ?? ok(BATCH));
  state.settings.mockReturnValue(ok(undefined, { data: undefined }));
  state.run = mutation();
  state.dissolve = mutation();
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
  state.canWrite = true;
});

const draw = (url = '/route-batches') => renderPage(<RouteBatches />, { url });

describe('RouteBatches: listado', () => {
  it('lista los lotes con estado, peso, paradas y a quién se ofrecieron', () => {
    setup();
    draw();
    expect(screen.getByRole('heading', { name: 'Recorridos' })).toBeInTheDocument();
    expect(screen.getByText('#1AAA01')).toBeInTheDocument();
    expect(screen.getByText('2 paradas · 25 kg')).toBeInTheDocument();
    expect(screen.getAllByText('Ofrecido').length).toBeGreaterThan(0);
    expect(screen.getByText('Ramón Villalba')).toBeInTheDocument();
    expect(screen.getByText(/Responde hasta/)).toBeInTheDocument();
  });

  it('cuenta cada estado en su pestaña', () => {
    setup();
    draw();
    expect(screen.getByRole('tab', { name: /Ofrecidos/ })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Asignados/ })).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Deshechos/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: /Completados/ })).toHaveTextContent('4');
  });

  it('filtra por estado y lo pide a la API', async () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('tab', { name: /Deshechos/ }));
    await waitFor(() =>
      expect(state.list).toHaveBeenLastCalledWith(expect.anything(), { status: 'dissolved' }, expect.anything()),
    );
  });

  it('sin lotes explica cuándo se arma uno', () => {
    setup({ list: ok({ data: [], total: 0, counts: {} }) });
    draw();
    expect(screen.getByText('No hay recorridos')).toBeInTheDocument();
  });

  it('si falla la API ofrece reintentar', () => {
    const refetch = vi.fn();
    setup({ list: failed(refetch) });
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin distribuidora elegida pide elegir una, no consulta y deja los botones deshabilitados', () => {
    state.needsDistributor = true;
    setup();
    draw();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Armar ahora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Parámetros' })).toBeDisabled();
    expect(state.list).toHaveBeenCalledWith(expect.anything(), expect.anything(), { enabled: false });
  });

  it('un lote asignado muestra al chofer que lo tomó', () => {
    setup({
      list: ok({
        data: [
          {
            ...BATCH,
            status: 'assigned',
            currentOffer: null,
            driver: { deliveryId: 'dl-1', userId: 'u-1', name: 'Ramón Villalba' },
          },
        ],
        total: 1,
        counts: COUNTS,
      }),
    });
    draw();
    expect(screen.getByText('Lo tomó')).toBeInTheDocument();
  });
});

describe('RouteBatches: acciones', () => {
  it('«Armar ahora» pide confirmación, corre el proceso y avisa el resultado', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onSuccess: (r: unknown) => void }).onSuccess({ candidates: 4, batches: 1, orders: 2 });
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Armar ahora' }));
    await waitFor(() => expect((state.run.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1));
    expect(notifications.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Armar los lotes ahora?' }));
    expect(notifications.notify.success).toHaveBeenCalledWith('1 lote(s) armado(s) con 2 pedido(s) de 4 candidato(s)');
  });

  it('si no se confirma, no arma nada', async () => {
    setup();
    notifications.confirm.mockResolvedValue(false);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Armar ahora' }));
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    expect((state.run.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('si no se armó nada lo dice con los candidatos que había', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onSuccess: (r: unknown) => void }).onSuccess({ candidates: 1, batches: 0, orders: 0 });
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Armar ahora' }));
    await waitFor(() =>
      expect(notifications.notify.success).toHaveBeenCalledWith('No se armó ningún lote (1 pedido(s) candidato(s))'),
    );
  });

  it('con el módulo apagado el 409 del back sale como error', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onError: (e: unknown) => void }).onError(new Error('La agrupación por recorrido está apagada'));
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Armar ahora' }));
    await waitFor(() => expect(notifications.notify.error).toHaveBeenCalled());
  });

  it('sin permiso de escritura no se puede armar', () => {
    state.canWrite = false;
    setup();
    draw();
    expect(screen.getByRole('button', { name: 'Armar ahora' })).toBeDisabled();
  });

  it('«Parámetros» abre la configuración con los valores vigentes', async () => {
    setup();
    state.settings.mockReturnValue(
      ok({
        process: 'route_batching',
        title: 'Agrupación por recorrido',
        description: '',
        fields: [
          {
            key: 'maxBatchSize',
            type: 'integer',
            min: 2,
            max: 20,
            default: 4,
            unit: null,
            description: 'Pedidos máximos por lote',
          },
        ],
        params: { maxBatchSize: 4 },
        isDefault: true,
        updatedAt: null,
        updatedByUserId: null,
      }),
    );
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    expect(await screen.findByText('Parámetros de los recorridos')).toBeInTheDocument();
    expect(screen.getByLabelText('Pedidos máximos por lote')).toHaveValue(4);
  });
});

describe('RouteBatches: detalle de un lote', () => {
  it('muestra las paradas en orden de entrega con su llegada, franja y kilos', () => {
    setup();
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    const first = items.findIndex((t) => t.includes('1. Jujuy 571'));
    const second = items.findIndex((t) => t.includes('2. Bolívar 1617'));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(second).toBeGreaterThan(first);
    expect(screen.getAllByText(/Mañana · 08:00 a 12:00/)).toHaveLength(2);
    expect(screen.getByText(/1.25 km desde la anterior/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mapa del recorrido con 2 paradas' })).toHaveAttribute('data-points', '2');
  });

  it('un lote ofrecido muestra hasta cuándo espera al chofer y los choferes contactados', () => {
    setup();
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    expect(screen.getByRole('status')).toHaveTextContent(/Esperando la respuesta de Ramón Villalba/);
    expect(screen.getByText('Esperando respuesta')).toBeInTheDocument();
  });

  it('deshacer pide confirmación y manda el lote', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer lote' }));
    await waitFor(() => expect((state.dissolve.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1));
    expect((state.dissolve.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(BATCH.batchId);
    const { text } = (notifications.confirm.mock.calls as Array<[{ text: string }]>)[0][0];
    expect(text).not.toMatch(/de a uno/);
    expect(text).toMatch(/libres para el despacho/);
  });

  it('si no se confirma, no deshace nada', async () => {
    setup();
    notifications.confirm.mockResolvedValue(false);
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer lote' }));
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    expect((state.dissolve.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('un lote asignado ya no se puede deshacer', () => {
    setup({
      detail: ok({
        ...BATCH,
        status: 'assigned',
        currentOffer: null,
        driver: { deliveryId: 'dl-1', userId: 'u-1', name: 'Ramón Villalba' },
        offers: [offer('accepted')],
      }),
    });
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    expect(screen.queryByRole('button', { name: 'Deshacer lote' })).not.toBeInTheDocument();
    expect(screen.getByText('Aceptó')).toBeInTheDocument();
  });

  it('un lote deshecho explica por qué y muestra sus paradas aunque ya no estén vivas', () => {
    setup({
      detail: ok({
        ...BATCH,
        status: 'dissolved',
        closeReason: 'exhausted',
        currentOffer: null,
        offers: [offer('expired', { respondedAt: '2026-11-01T15:01:00.000Z' })],
        stops: [stop(1, 'Jujuy 571', { active: false }), stop(2, 'Bolívar 1617', { active: false })],
      }),
    });
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    expect(screen.getByRole('status')).toHaveTextContent(/Ningún chofer lo tomó/);
    expect(screen.getByRole('status')).not.toHaveTextContent(/de a uno/);
    // Con el lote cerrado no se repite «salió del lote» en cada parada.
    expect(screen.queryByText(/salió del lote/)).not.toBeInTheDocument();
    expect(screen.getByText('No respondió')).toBeInTheDocument();
    expect(screen.getByText(/sin respuesta/)).toBeInTheDocument();
  });

  it('una oferta retirada porque el lote se deshizo lo dice', () => {
    setup({
      detail: ok({
        ...BATCH,
        status: 'dissolved',
        closeReason: 'admin',
        currentOffer: null,
        offers: [offer('expired', { respondedAt: '2026-11-01T15:00:30.000Z', expiresAt: '2026-11-01T15:10:00.000Z' })],
      }),
    });
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    expect(screen.getByText('Se retiró')).toBeInTheDocument();
  });

  it('una parada que salió de un lote vivo lo dice', () => {
    setup({ detail: ok({ ...BATCH, stops: [stop(1, 'Jujuy 571'), stop(2, 'Bolívar 1617', { active: false })] }) });
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    expect(screen.getByText(/salió del lote/)).toBeInTheDocument();
  });

  it('mientras carga el detalle muestra el esqueleto', () => {
    setup({ detail: loading() });
    draw('/route-batches?batch=11111111-1111-4111-8111-1111111aaa01');
    expect(screen.getByRole('status', { name: 'Cargando detalle' })).toBeInTheDocument();
  });
});
