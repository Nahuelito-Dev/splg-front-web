import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  needsDistributor: false,
  canWrite: true,
  forecast: vi.fn(),
  invitations: vi.fn(),
  stats: vi.fn(),
  processes: vi.fn(),
  run: {} as Record<string, unknown>,
  simulate: {} as Record<string, unknown>,
}));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: state.needsDistributor,
    canWrite: state.canWrite,
    writeHint: state.canWrite ? undefined : 'Elegí una distribuidora',
  }),
}));
vi.mock('../../../services/queries/repurchase', () => ({
  useRepurchaseForecast: (...args: unknown[]) => state.forecast(...args) as unknown,
  useRepurchaseInvitations: (...args: unknown[]) => state.invitations(...args) as unknown,
  useRepurchaseStats: () => state.stats() as unknown,
  useRunRepurchase: () => state.run,
  useSimulateRepurchase: () => state.simulate,
}));
vi.mock('../../../services/queries/moduleConfig', () => ({
  useProcessConfigs: (...args: unknown[]) => state.processes(...args) as unknown,
  useUpdateProcessConfig: () => mutation(),
}));
vi.mock('../../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
vi.mock('../../../common/components/ui/ResponsiveTable', () => import('../../../test/responsiveTableStub'));
const notifications = vi.hoisted(() => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../utils/notifications', () => notifications);

import { Repurchase } from './Repurchase';

const ROW = {
  customer: {
    customerId: 'c-1',
    userId: 'u-1',
    fullName: 'Lucía Benítez',
    email: 'l@mail.com',
    phoneNumber: '+5493815550003',
  },
  estimatedAt: '2026-11-02T12:00:00.000Z',
  daysLeft: 2.1,
  source: 'history',
  ordersUsed: 5,
  lastPurchaseAt: '2026-10-20T12:00:00.000Z',
  lastPurchaseKg: 20,
  declaredKgPerMonth: null,
  estimatedKgPerMonth: 45.5,
  usualUnits: 2,
  usualCylinderIds: ['g-1'],
  noticeEnabled: true,
  noticeDays: 3,
  openInvitation: null,
  offsetDays: 0,
  notifyAt: null,
  notifiedAt: null,
};

const DECLARED = {
  ...ROW,
  customer: { ...ROW.customer, customerId: null, userId: 'u-2', fullName: 'Mario Ruiz', phoneNumber: null },
  daysLeft: -4.2,
  source: 'declared',
  declaredKgPerMonth: 30,
  usualUnits: 1,
  openInvitation: { invitationId: 'i-1', expiresAt: '2026-11-01T12:00:00.000Z' },
  offsetDays: 3,
  notifyAt: '2026-11-01T21:00:00.000Z',
};

const INVITATION = {
  invitationId: 'i-1',
  status: 'accepted',
  customer: { customerId: 'c-1', userId: 'u-1', fullName: 'Lucía Benítez', email: 'l@mail.com', phoneNumber: null },
  projectedDepletionAt: '2026-10-27T12:00:00.000Z',
  estimateSource: 'history',
  totalUnits: 1,
  expiresAt: '2026-10-31T15:00:00.000Z',
  createdAt: '2026-10-31T14:00:00.000Z',
  respondedAt: '2026-10-31T14:30:00.000Z',
  orderId: 'o-1',
};

const STATS = {
  from: '2026-08-02T03:00:00.000Z',
  to: '2026-11-01T03:00:00.000Z',
  sent: 9,
  pending: 2,
  accepted: 3,
  rejected: 1,
  expired: 2,
  cancelled: 1,
  conversionRate: 0.5,
  acceptedRevenue: 47400,
  accuracy: {
    measured: 6,
    meanAbsoluteErrorDays: 2.5,
    withinMarginRate: 0.67,
    marginDays: 3,
    meanBiasDays: 1.5,
  },
};

/** El período de las estadísticas, en días argentinos: la lista pide el mismo que los contadores. */
const RANGE = { from: '2026-08-02', to: '2026-10-31' };

const CONFIG = {
  process: 'repurchase',
  title: 'Anticipación de recompra',
  description: 'Estima cuándo se le acaba la garrafa a cada cliente y le ofrece reponer (CU-106).',
  fields: [
    {
      key: 'anticipationDays',
      type: 'integer',
      min: 1,
      max: 30,
      default: 3,
      unit: 'días',
      description: 'Anticipación con que se envía la invitación a reponer',
    },
  ],
  params: { anticipationDays: 3 },
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
};

const setup = () => {
  state.forecast.mockReturnValue(
    ok({ data: [ROW, DECLARED], total: 2, days: 14, generatedAt: '2026-10-31T12:00:00Z' }),
  );
  state.invitations.mockReturnValue(ok({ data: [INVITATION], total: 1 }));
  state.stats.mockReturnValue(ok(STATS));
  state.processes.mockReturnValue(ok([CONFIG]));
  state.run = mutation();
  state.simulate = mutation();
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
  state.canWrite = true;
});

const draw = (url = '/customers/repurchase') => renderPage(<Repurchase />, { url });

describe('Repurchase: próximas recompras (CU-146)', () => {
  it('lista a los clientes con la fecha, de dónde sale y su última compra', () => {
    setup();
    draw();
    expect(screen.getByRole('heading', { name: 'Recompra anticipada' })).toBeInTheDocument();
    expect(screen.getByText('Lucía Benítez')).toBeInTheDocument();
    expect(screen.getByText(/Sus compras/)).toBeInTheDocument();
    expect(screen.getByText(/Consumo declarado/)).toBeInTheDocument();
    expect(screen.getByText('En 2 días')).toBeInTheDocument();
    expect(screen.getByText('Hace 4 días')).toBeInTheDocument();
    expect(screen.getByText('Invitación abierta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lucía Benítez/ })).toHaveAttribute(
      'href',
      '/customers/details/c-1?tab=repurchase',
    );
  });

  it('muestra el ajuste de cada cliente y la hora programada del aviso, con su ayuda', () => {
    setup();
    draw();
    expect(screen.getByText(/\+3 días respecto del promedio/)).toBeInTheDocument();
    expect(screen.getByText(/Se avisa .* a las 18:00/)).toBeInTheDocument();
    expect(screen.getByText(/Sólo rige con consumo declarado o poca historia/)).toBeInTheDocument();
    // Sin ajuste ni invitación abierta, la fila de Lucía no dice nada de eso.
    expect(screen.getAllByText(/respecto del promedio/)).toHaveLength(1);
  });

  it('un cliente sin perfil de cliente se muestra sin enlace a la ficha', () => {
    setup();
    draw();
    expect(screen.getByText('Mario Ruiz')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Mario Ruiz/ })).not.toBeInTheDocument();
  });

  it('pide 14 días por omisión y cambia la ventana', () => {
    setup();
    draw();
    expect(state.forecast).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, 14);
    expect(screen.getByRole('button', { name: '14 días' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '30 días' }));
    expect(state.forecast).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, 30);
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('una ventana desconocida en la URL vuelve a la de 14 días', () => {
    setup();
    draw('/customers/repurchase?days=999');
    expect(state.forecast).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, 14);
  });

  it('sin nadie en la ventana lo dice', () => {
    setup();
    state.forecast.mockReturnValue(ok({ data: [], total: 0, days: 14, generatedAt: '2026-10-31T12:00:00Z' }));
    draw();
    expect(screen.getByText('Nadie se queda sin gas en esta ventana')).toBeInTheDocument();
  });

  it('si la consulta falla ofrece reintentar', () => {
    setup();
    const refetch = vi.fn();
    state.forecast.mockReturnValue(failed(refetch));
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra el listado', () => {
    setup();
    state.forecast.mockReturnValue(loading());
    draw();
    expect(screen.getByRole('status', { name: 'Cargando próximas recompras' })).toBeInTheDocument();
  });

  it('un cliente con el aviso desactivado lo dice', () => {
    setup();
    state.forecast.mockReturnValue(
      ok({ data: [{ ...ROW, noticeEnabled: false }], total: 1, days: 14, generatedAt: '2026-10-31T12:00:00Z' }),
    );
    draw();
    expect(screen.getByText('Aviso desactivado')).toBeInTheDocument();
  });
});

/** La tarjeta del indicador: el título está dos niveles adentro. */
const kpi = (title: string): HTMLElement =>
  (
    within(screen.getByRole('region', { name: 'Resultados de los últimos 90 días' }))
      .getByText(title)
      .closest('div') as HTMLElement
  ).parentElement as HTMLElement;

describe('Repurchase: resultados', () => {
  it('muestra las invitaciones, lo aceptado, la conversión y lo vendido', () => {
    setup();
    draw();
    expect(screen.getByRole('region', { name: 'Resultados de los últimos 90 días' })).toBeInTheDocument();
    expect(kpi('Invitaciones')).toHaveTextContent('9');
    expect(kpi('Aceptadas')).toHaveTextContent('3');
    expect(kpi('Conversión')).toHaveTextContent('50 %');
    expect(kpi('Vendido por invitación')).toHaveTextContent('47.400');
  });

  it('la tarjeta de acierto muestra el error medio y la tendencia, y el vacío cuando no hay compras', () => {
    setup();
    draw();
    const card = screen.getByRole('generic', { name: 'Acierto de la predicción' });
    expect(within(card).getByText('2,5 días')).toBeInTheDocument();
    expect(within(card).getByText('67 %')).toBeInTheDocument();
    expect(within(card).getByText(/Tiende a atrasarse/)).toBeInTheDocument();
    cleanup();
    state.stats.mockReturnValue(
      ok({
        ...STATS,
        accuracy: {
          measured: 0,
          meanAbsoluteErrorDays: null,
          withinMarginRate: null,
          marginDays: 3,
          meanBiasDays: null,
        },
      }),
    );
    draw();
    expect(screen.getByText('Todavía no hay compras para comparar')).toBeInTheDocument();
  });

  it('sin invitaciones resueltas la conversión no inventa una tasa', () => {
    setup();
    state.stats.mockReturnValue(ok({ ...STATS, conversionRate: null, acceptedRevenue: 0, accepted: 0 }));
    draw();
    expect(kpi('Conversión')).toHaveTextContent('—');
  });

  it('la pestaña Invitaciones lista cómo terminó cada una, con el contador por estado', () => {
    setup();
    draw('/customers/repurchase?tab=invitations');
    expect(screen.getByText('Aceptada')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Aceptadas/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: /Compró por su cuenta/ })).toHaveTextContent('1');
    expect(state.invitations).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, RANGE);
  });

  it('filtra las invitaciones por estado y lo pide a la API', async () => {
    setup();
    draw('/customers/repurchase?tab=invitations');
    fireEvent.click(screen.getByRole('tab', { name: /Vencidas/ }));
    await waitFor(() =>
      expect(state.invitations).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, { ...RANGE, status: 'expired' }),
    );
  });

  it('sin invitaciones lo explica', () => {
    setup();
    state.invitations.mockReturnValue(ok({ data: [], total: 0 }));
    draw('/customers/repurchase?tab=invitations');
    expect(screen.getByText('No hay invitaciones')).toBeInTheDocument();
  });

  it('si el listado de invitaciones falla ofrece reintentar', () => {
    setup();
    const refetch = vi.fn();
    state.invitations.mockReturnValue(failed(refetch));
    draw('/customers/repurchase?tab=invitations');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('Repurchase: acciones', () => {
  it('Simular muestra a quién se invitaría sin haber escrito nada', async () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }));
    const mutate = state.simulate.mutate as ReturnType<typeof vi.fn>;
    expect(mutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    const { onSuccess } = mutate.mock.calls[0][1] as { onSuccess: (r: unknown) => void };
    onSuccess({
      evaluated: 7,
      invited: 1,
      expired: 0,
      skipped: { not_yet: 4, recent_order: 1 },
      candidates: [
        {
          userId: 'u-1',
          fullName: 'Lucía Benítez',
          projectedDepletionAt: '2026-10-27T12:00:00.000Z',
          source: 'history',
          totalUnits: 1,
        },
      ],
    });
    const dialog = await screen.findByRole('dialog', { name: 'Simulación de la corrida' });
    expect(within(dialog).getByText(/7 cliente\(s\) evaluados/)).toBeInTheDocument();
    expect(within(dialog).getByText(/sin invitar: 4 todavía no les toca/)).toBeInTheDocument();
    expect(within(dialog).getByText('Lucía Benítez')).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('una simulación sin candidatos dice que hoy no se invitaría a nadie', async () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }));
    const { onSuccess } = (state.simulate.mutate as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      onSuccess: (r: unknown) => void;
    };
    onSuccess({ evaluated: 0, invited: 0, expired: 0, skipped: {}, candidates: [] });
    expect(await screen.findByText('Hoy no se invitaría a nadie.')).toBeInTheDocument();
  });

  it('Correr ahora pide confirmar y después avisa lo que hizo', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    await waitFor(() => expect(state.run.mutate).toHaveBeenCalledWith(undefined, expect.any(Object)));
    const { onSuccess } = (state.run.mutate as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      onSuccess: (r: unknown) => void;
    };
    onSuccess({ evaluated: 3, invited: 2, expired: 1, skipped: {}, candidates: [] });
    expect(notifications.notify.success).toHaveBeenCalledWith(expect.stringContaining('2 invitación(es)'));
  });

  it('si no se confirma no corre', async () => {
    setup();
    notifications.confirm.mockResolvedValue(false);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    expect(state.run.mutate).not.toHaveBeenCalled();
  });

  it('un error de la corrida se avisa', () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }));
    const { onError } = (state.simulate.mutate as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      onError: (e: unknown) => void;
    };
    expect(onError).toBe(notifications.notify.error);
  });

  it('Correr ahora queda bloqueado sin permiso de escritura', () => {
    setup();
    state.canWrite = false;
    draw();
    expect(screen.getByRole('button', { name: 'Correr ahora' })).toBeDisabled();
  });

  it('Parámetros abre el editor del proceso `repurchase` de procesos automáticos', async () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    expect(await screen.findByText(/Anticipación con que se envía la invitación/)).toBeInTheDocument();
    expect(state.processes).toHaveBeenLastCalledWith({ enabled: true });
  });
});

describe('Repurchase: fallas y estados', () => {
  it('Simular y Correr ahora no corren a la vez: mientras uno trabaja, el otro queda deshabilitado', () => {
    setup();
    state.simulate = mutation({ isPending: true });
    draw();
    expect(screen.getByRole('button', { name: 'Correr ahora' })).toBeDisabled();
    cleanup();
    state.simulate = mutation();
    state.run = mutation({ isPending: true });
    draw();
    expect(screen.getByRole('button', { name: 'Simular' })).toBeDisabled();
  });

  it('si fallan las estadísticas avisa en lugar de mostrar los indicadores y deja reintentar', () => {
    setup();
    const refetch = vi.fn();
    state.stats.mockReturnValue(failed(refetch));
    draw();
    expect(screen.queryByText('Conversión')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
    // El listado de próximas recompras sigue.
    expect(screen.getByText('Lucía Benítez')).toBeInTheDocument();
  });

  it('si falla la carga de los parámetros lo muestra y deja reintentar', () => {
    setup();
    const refetch = vi.fn();
    state.processes.mockReturnValue(failed(refetch));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('si la API no devuelve el proceso de recompra, también lo dice', () => {
    setup();
    state.processes.mockReturnValue(ok([{ ...CONFIG, process: 'otro' }]));
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.getByText('La API no devolvió el proceso de recompra')).toBeInTheDocument();
  });

  it('un estado inválido en la URL se toma como «todas»', () => {
    setup();
    draw('/customers/repurchase?tab=invitations&status=cualquier-cosa');
    expect(state.invitations).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, RANGE);
  });

  it('sin estadísticas la lista no se acota por período y los contadores quedan vacíos', () => {
    setup();
    state.stats.mockReturnValue(loading());
    draw('/customers/repurchase?tab=invitations');
    expect(state.invitations).toHaveBeenLastCalledWith({ page: 0, pageSize: 10 }, {});
  });

  it('el interruptor del proceso aparece como casilla en Parámetros y se manda sólo si cambia', async () => {
    setup();
    state.processes.mockReturnValue(
      ok([
        {
          ...CONFIG,
          fields: [
            {
              key: 'enabled',
              type: 'integer',
              min: 0,
              max: 1,
              default: 0,
              unit: null,
              description: 'Enciende la anticipación',
            },
            ...CONFIG.fields,
          ],
          params: { enabled: 0, anticipationDays: 3 },
        },
      ]),
    );
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    const casilla = await screen.findByRole('checkbox', { name: /encendida/ });
    expect(casilla).not.toBeChecked();
    fireEvent.click(casilla);
    expect(casilla).toBeChecked();
  });
});

describe('Repurchase: administrador general', () => {
  it('sin distribuidora pide «Ver como» y no consulta nada', () => {
    setup();
    state.needsDistributor = true;
    draw();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parámetros' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simular' })).toBeDisabled();
    expect(screen.queryByRole('tab', { name: 'Invitaciones' })).not.toBeInTheDocument();
  });
});
