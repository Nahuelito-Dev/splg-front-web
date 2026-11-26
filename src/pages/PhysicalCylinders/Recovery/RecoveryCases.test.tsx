import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, mutation, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  needsDistributor: false,
  cases: vi.fn(),
  detail: vi.fn(),
  report: vi.fn(),
  settings: vi.fn(),
  run: {} as Record<string, unknown>,
}));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: state.needsDistributor,
    canWrite: !state.needsDistributor,
    writeHint: undefined,
  }),
}));
vi.mock('../../../services/queries/recovery', () => ({
  useRecoveryCases: (...args: unknown[]) => state.cases(...args) as unknown,
  useRecoveryCase: (...args: unknown[]) => state.detail(...args) as unknown,
  useRecoveryReport: (...args: unknown[]) => state.report(...args) as unknown,
  useRecoverySettings: (...args: unknown[]) => state.settings(...args) as unknown,
  useRunRecovery: () => state.run,
  useResolveRecoveryCase: () => mutation(),
  useUpdateRecoverySettings: () => mutation(),
}));
vi.mock('../../../common/components/ui/ResponsiveTable', () => import('../../../test/responsiveTableStub'));
vi.mock('../../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
const notifications = vi.hoisted(() => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../utils/notifications', () => notifications);

import { RecoveryCases } from './RecoveryCases';

const CASE = {
  caseId: 'c-1',
  status: 'escalated',
  step: 3,
  depositAmount: 70000,
  deliveredAt: '2026-08-20T13:59:32.000Z',
  daysOut: 72,
  stepDueAt: '2026-11-07T15:00:00.000Z',
  openedAt: '2026-10-31T15:02:15.000Z',
  exhaustedAt: '2026-11-14T15:00:00.000Z',
  closedAt: null,
  customer: { userId: 'u-1', fullName: 'Gonzalo Acosta', email: 'g@x.com', phoneNumber: '+54 376 450' },
  cylinder: { cylinderId: 'cy-1', serial: 'SPLG-00197', state: 'with_customer', product: 'Garrafa 45kg' },
  lastNotice: null,
  pickup: null,
};
const COUNTS = { open: 2, escalated: 1, lost: 1, returned: 3, written_off: 1 };
const DETAIL = {
  ...CASE,
  notices: [
    {
      noticeId: 'n-1',
      step: 1,
      kind: 'reminder',
      status: null,
      orderId: null,
      sentAt: '2026-10-31T15:02:15.000Z',
      expiresAt: '2026-11-07T15:02:15.000Z',
      respondedAt: null,
      responseNote: null,
    },
    {
      noticeId: 'n-2',
      step: 1,
      kind: 'pickup_offer',
      status: 'expired',
      orderId: 'ord-123456',
      sentAt: '2026-10-31T15:02:16.000Z',
      expiresAt: '2026-11-03T15:02:16.000Z',
      respondedAt: null,
      responseNote: 'El pedido terminó sin que el chofer retirara el envase',
    },
  ],
  history: [
    {
      movementId: 'm-1',
      fromState: 'dispatched',
      toState: 'with_customer',
      orderId: 'o-1',
      note: 'Entregado al cliente',
      createdAt: '2026-08-20T13:59:32.000Z',
    },
  ],
  resolution: null,
};

const setup = (over: { cases?: unknown; detail?: unknown; report?: unknown } = {}) => {
  state.cases.mockReturnValue(over.cases ?? ok({ data: [CASE], total: 1, counts: COUNTS }));
  state.detail.mockReturnValue(over.detail ?? ok(DETAIL));
  state.report.mockReturnValue(
    over.report ??
      ok({
        lost: [{ ...CASE, caseId: 'c-2', status: 'lost', depositAmount: 26000 }],
        escalated: [CASE],
        manualReview: [{ cylinderId: 'cy-9', serial: 'SPLG-00999', reason: 'sin_entrega_registrada' }],
        totals: { lostCount: 1, lostAmount: 26000, escalatedCount: 1, escalatedAmount: 70000, manualReviewCount: 1 },
      }),
  );
  state.settings.mockReturnValue(ok(undefined, { data: undefined }));
  state.run = mutation();
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
});

const draw = (url = '/physical-cylinders/recovery') => renderPage(<RecoveryCases />, { url });

describe('RecoveryCases: casos', () => {
  it('lista el envase, el cliente, el estado, el escalón y el depósito', () => {
    setup();
    draw();
    expect(screen.getByRole('heading', { name: 'Recupero de envases' })).toBeInTheDocument();
    expect(screen.getByText('SPLG-00197')).toBeInTheDocument();
    expect(screen.getByText('Gonzalo Acosta')).toBeInTheDocument();
    expect(screen.getAllByText('Espera tu decisión').length).toBeGreaterThan(0);
    expect(screen.getByText(/Agotado ·/)).toBeInTheDocument();
  });

  it('cuenta en la pestaña lo que espera la decisión (escalados y perdidos)', () => {
    setup();
    draw();
    expect(screen.getByRole('tab', { name: /Esperan tu decisión/ })).toHaveTextContent('2');
  });

  it('«Esperan tu decisión» pide los pendientes a la API', async () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('tab', { name: /Esperan tu decisión/ }));
    await waitFor(() => expect(state.cases).toHaveBeenLastCalledWith(expect.anything(), { pending: true }));
  });

  it('filtra por escalón y por cliente de la URL', () => {
    setup();
    draw('/physical-cylinders/recovery?step=2&customer=u-1');
    expect(state.cases).toHaveBeenLastCalledWith(expect.anything(), { step: 2, customerId: 'u-1' });
    expect(screen.getByRole('button', { name: 'Quitar el filtro por cliente' })).toBeInTheDocument();
  });

  it('sin casos explica cuándo se abre uno', () => {
    setup({ cases: ok({ data: [], total: 0, counts: {} }) });
    draw();
    expect(screen.getByText('No hay casos')).toBeInTheDocument();
  });

  it('si falla la API ofrece reintentar', () => {
    const refetch = vi.fn();
    setup({ cases: failed(refetch) });
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin distribuidora elegida pide elegir una y no consulta', () => {
    state.needsDistributor = true;
    setup();
    draw();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.cases).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Correr ahora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Parámetros' })).toBeDisabled();
  });
});

describe('RecoveryCases: acciones', () => {
  it('«Correr ahora» pide confirmar, corre el proceso y avisa el resultado', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onSuccess: (r: unknown) => void }).onSuccess({
        opened: 2,
        notices: 3,
        offers: 0,
        escalated: 1,
        lost: 0,
        closedByReturn: 0,
        manualReview: 4,
        closedCoveredByOwned: 5,
      });
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    await waitFor(() => expect(state.run.mutate).toHaveBeenCalled());
    const [pedido] = notifications.confirm.mock.calls[0] as [{ text: string }];
    expect(pedido.text).toContain('un solo push por cliente');
    expect(notifications.notify.success).toHaveBeenCalledWith(expect.stringContaining('2 caso(s) nuevo(s)'));
    expect(notifications.notify.success).toHaveBeenCalledWith(expect.stringContaining('4 para revisión manual'));
    expect(notifications.notify.success).toHaveBeenCalledWith(
      expect.stringContaining('5 cerrado(s) porque el envase ya es del cliente'),
    );
  });

  it('sin cierres por la cuenta de envases, el aviso no los menciona', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onSuccess: (r: unknown) => void }).onSuccess({
        opened: 1,
        notices: 1,
        offers: 0,
        escalated: 0,
        lost: 0,
        closedByReturn: 0,
        manualReview: 0,
        closedCoveredByOwned: 0,
      });
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    await waitFor(() => expect(notifications.notify.success).toHaveBeenCalled());
    expect(notifications.notify.success).toHaveBeenCalledWith(expect.not.stringContaining('ya es del cliente'));
  });

  it('si no se confirma, «Correr ahora» no corre nada', async () => {
    setup();
    notifications.confirm.mockResolvedValue(false);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalled());
    expect(state.run.mutate).not.toHaveBeenCalled();
  });

  it('si la API responde que está apagado, muestra el motivo', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onError: (e: unknown) => void }).onError(new Error('El recupero de envases está apagado'));
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    await waitFor(() => expect(notifications.notify.error).toHaveBeenCalled());
  });

  it('«Parámetros» abre la configuración con los valores vigentes', async () => {
    setup();
    state.settings.mockReturnValue(
      ok({
        process: 'cylinder_recovery',
        title: 'Recuperación de envases',
        description: '',
        fields: [
          {
            key: 'toleranceDays',
            type: 'integer',
            min: 1,
            max: 365,
            default: 30,
            unit: 'días',
            description: 'Tolerancia',
          },
        ],
        params: { toleranceDays: 30 },
        isDefault: true,
        updatedAt: null,
        updatedByUserId: null,
      }),
    );
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    expect(await screen.findByText('Parámetros del recupero de envases')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tolerancia/)).toHaveValue(30);
  });
});

describe('RecoveryCases: legajo', () => {
  it('abre el legajo con los avisos, la oferta de retiro vencida y el historial del envase', () => {
    setup();
    draw('/physical-cylinders/recovery?case=c-1');
    expect(screen.getByText('Envase SPLG-00197')).toBeInTheDocument();
    expect(screen.getByText('Recordatorio de devolución')).toBeInTheDocument();
    expect(screen.getByText('Oferta de retiro en la próxima entrega')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText(/sin que el chofer retirara/)).toBeInTheDocument();
    expect(screen.getByText(/Entregado al cliente/)).toBeInTheDocument();
    expect(screen.getByText(/decidís vos/)).toBeInTheDocument();
  });

  it('muestra el riesgo del cliente y, en la oferta que aprovecha la hoja, «Retiro aprovechando la hoja #N»', () => {
    const risk = { score: 0.344, band: 'high', delayedCases: 5, ordersTotal: 10, neutral: false, updatedAt: null };
    const offer = {
      ...DETAIL.notices[1],
      status: 'pending',
      respondedAt: null,
      responseNote: null,
      opportunistic: true,
      routeBatchId: 'h-1',
      routeSheetNumber: 12,
    };
    setup({ detail: ok({ ...DETAIL, risk, notices: [DETAIL.notices[0], offer] }) });
    draw('/physical-cylinders/recovery?case=c-1');
    expect(screen.getByText('Riesgo del cliente')).toBeInTheDocument();
    expect(screen.getByText('Riesgo alto (puntaje 0,34)')).toBeInTheDocument();
    expect(screen.getByText('Retiro aprovechando la hoja #12')).toBeInTheDocument();
    expect(screen.queryByText('Oferta de retiro en la próxima entrega')).not.toBeInTheDocument();
  });

  it('sin riesgo en la respuesta no inventa la fila', () => {
    setup();
    draw('/physical-cylinders/recovery?case=c-1');
    expect(screen.queryByText('Riesgo del cliente')).not.toBeInTheDocument();
  });

  it('un caso que espera decisión deja decidir; uno en aviso no', () => {
    setup();
    draw('/physical-cylinders/recovery?case=c-1');
    expect(screen.getByRole('button', { name: 'Decidir el caso' })).toBeEnabled();
    cleanup();
    setup({ detail: ok({ ...DETAIL, status: 'open', step: 1 }) });
    draw('/physical-cylinders/recovery?case=c-1');
    expect(screen.queryByRole('button', { name: 'Decidir el caso' })).not.toBeInTheDocument();
  });

  it('«Decidir el caso» abre la decisión con las tres opciones', () => {
    setup();
    draw('/physical-cylinders/recovery?case=c-1');
    fireEvent.click(screen.getByRole('button', { name: 'Decidir el caso' }));
    expect(screen.getByLabelText('Cobrar el depósito')).toBeInTheDocument();
    expect(screen.getByLabelText('Dar el envase de baja')).toBeInTheDocument();
    expect(screen.getByLabelText('Cerrar sin cargo')).toBeInTheDocument();
  });

  it('un caso resuelto muestra la decisión, quién la tomó y la nota', () => {
    setup({
      detail: ok({
        ...DETAIL,
        status: 'written_off',
        closedAt: '2026-11-20T12:00:00.000Z',
        resolution: { resolvedByUserId: 'a-1', resolvedByName: 'Admin SPLG', note: 'Extraviado' },
      }),
    });
    draw('/physical-cylinders/recovery?case=c-1');
    expect(screen.getByText(/Dar el envase de baja · Admin SPLG/)).toBeInTheDocument();
    expect(screen.getByText(/Extraviado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decidir el caso' })).not.toBeInTheDocument();
  });
});

describe('RecoveryCases: reporte', () => {
  it('muestra los perdidos, los escalados y los envases para revisión manual con sus totales', () => {
    setup();
    draw('/physical-cylinders/recovery?tab=report');
    expect(screen.getByText('Envases perdidos', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('SPLG-00999')).toBeInTheDocument();
    expect(screen.getByText('No hay un movimiento de entrega registrado')).toBeInTheDocument();
    expect(screen.getAllByText('SPLG-00197').length).toBeGreaterThan(0);
  });

  it('sin nada para revisar lo dice', () => {
    setup({
      report: ok({
        lost: [],
        escalated: [],
        manualReview: [],
        totals: { lostCount: 0, lostAmount: 0, escalatedCount: 0, escalatedAmount: 0, manualReviewCount: 0 },
      }),
    });
    draw('/physical-cylinders/recovery?tab=report');
    expect(screen.getByText('Nada para revisar')).toBeInTheDocument();
    expect(screen.getByText('No hay casos esperando tu decisión.')).toBeInTheDocument();
  });

  it('si falla ofrece reintentar', () => {
    const refetch = vi.fn();
    setup({ report: failed(refetch) });
    draw('/physical-cylinders/recovery?tab=report');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });
});
