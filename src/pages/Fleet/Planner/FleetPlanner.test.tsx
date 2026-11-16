import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, mutation, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  needsDistributor: false,
  cases: vi.fn(),
  forecast: vi.fn(),
  detail: vi.fn(),
  settings: vi.fn(),
  run: {} as Record<string, unknown>,
  replan: {} as Record<string, unknown>,
  cancel: {} as Record<string, unknown>,
}));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: state.needsDistributor,
    canWrite: !state.needsDistributor,
    writeHint: undefined,
  }),
}));
vi.mock('../../../services/queries/planner', () => ({
  usePlanningCases: (...args: unknown[]) => state.cases(...args) as unknown,
  usePlannerForecast: (...args: unknown[]) => state.forecast(...args) as unknown,
  usePlanningCase: (...args: unknown[]) => state.detail(...args) as unknown,
  usePlannerSettings: (...args: unknown[]) => state.settings(...args) as unknown,
  useRunPlanner: () => state.run,
  useReplanTask: () => state.replan,
  useCancelPlanningCase: () => state.cancel,
  useConfirmPlanningCase: () => mutation(),
  useForceTaskWindow: () => mutation(),
  useUpdatePlannerSettings: () => mutation(),
}));
vi.mock('../../../common/components/ui/ResponsiveTable', () => import('../../../test/responsiveTableStub'));
vi.mock('../../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
const notifications = vi.hoisted(() => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../utils/notifications', () => notifications);

import { FleetPlanner } from './FleetPlanner';

const CASE = {
  caseId: 'c-1',
  status: 'escalated',
  taskId: 't-1',
  taskName: 'Service: aceite y filtros',
  criticality: 'non_blocking',
  carId: 'car-1',
  patent: 'AB123CD',
  deliveryId: 'd-1',
  driverName: 'Ramón Villalba',
  projectedDueAt: '2026-11-03T00:00:00.000Z',
  openedAt: '2026-10-30T12:00:00.000Z',
  escalationReason: 'exhausted',
  escalationText: 'el chofer rechazó o no respondió ninguna de las ventanas ofrecidas',
  escalatedAt: '2026-10-30T13:00:00.000Z',
  chosenStart: null,
  chosenEnd: null,
  chosenSource: null,
  resolvedAt: null,
  notes: null,
  currentProposal: null,
  lastProposal: null,
  proposalsCount: 3,
};

const COUNTS = { negotiating: 1, awaiting_confirmation: 0, escalated: 1, confirmed: 2, cancelled: 3 };
const DETAIL = {
  ...CASE,
  proposals: [
    {
      proposalId: 'p-1',
      caseId: 'c-1',
      taskId: 't-1',
      windowStart: '2026-11-01T11:00:00.000Z',
      windowEnd: '2026-11-01T16:00:00.000Z',
      rank: 1,
      status: 'rejected',
      expiresAt: '2026-10-31T11:00:00.000Z',
      respondedAt: '2026-10-30T14:00:00.000Z',
      rejectionReason: 'Tengo turno médico',
      altWindowStart: null,
      altWindowEnd: null,
    },
  ],
  windows: [
    {
      start: '2026-11-01T11:00:00.000Z',
      end: '2026-11-01T16:00:00.000Z',
      demand: 1.5,
      unitsLeft: 2,
      urgent: false,
      offered: true,
      discardReason: null,
    },
    {
      start: '2026-11-02T11:00:00.000Z',
      end: '2026-11-02T16:00:00.000Z',
      demand: 4,
      unitsLeft: 0,
      urgent: true,
      offered: false,
      discardReason: 'coverage',
    },
  ],
};

const FORECAST = {
  vehicles: [
    {
      carId: 'car-1',
      patent: 'AB123CD',
      typeCar: 'Camioneta',
      odometerKm: 10000,
      kmPerDay: 54.2,
      usageSource: 'own',
      historyDays: 72,
      lastUsageDay: '2026-10-29',
      usageStale: false,
      nextWindow: null,
      items: [
        {
          taskId: 't-1',
          taskName: 'Service: aceite y filtros',
          criticality: 'non_blocking',
          needsWorkshop: true,
          dueAt: null,
          dueKm: 10500,
          kmRemaining: 500,
          predictedByKmAt: '2026-11-08T15:00:00.000Z',
          projectedDueAt: '2026-11-08T15:00:00.000Z',
          daysLeft: 9,
          dueSoon: true,
          underObservation: false,
          scheduledAt: null,
          caseId: null,
          caseStatus: null,
        },
        {
          taskId: 't-2',
          taskName: 'Seguro del vehículo',
          criticality: 'blocking',
          needsWorkshop: false,
          dueAt: '2027-04-22T00:00:00.000Z',
          dueKm: null,
          kmRemaining: null,
          predictedByKmAt: null,
          projectedDueAt: '2027-04-22T00:00:00.000Z',
          daysLeft: 173,
          dueSoon: false,
          underObservation: false,
          scheduledAt: null,
          caseId: null,
          caseStatus: null,
        },
      ],
    },
  ],
};

const setup = (over: { cases?: unknown; forecast?: unknown } = {}) => {
  state.cases.mockReturnValue(over.cases ?? ok({ data: [CASE], total: 1, counts: COUNTS }));
  state.forecast.mockReturnValue(over.forecast ?? ok(FORECAST));
  state.detail.mockReturnValue(ok(DETAIL));
  state.settings.mockReturnValue(ok(undefined, { data: undefined }));
  state.run = mutation();
  state.replan = mutation();
  state.cancel = mutation();
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
});

const draw = (url = '/fleet/planner') => renderPage(<FleetPlanner />, { url });

describe('FleetPlanner: casos', () => {
  it('lista los casos con su estado y por qué se escaló', () => {
    setup();
    draw();
    expect(screen.getByRole('heading', { name: 'Planificador de taller' })).toBeInTheDocument();
    expect(screen.getByText('AB123CD')).toBeInTheDocument();
    expect(screen.getByText('Service: aceite y filtros')).toBeInTheDocument();
    expect(screen.getAllByText('Escalado').length).toBeGreaterThan(0);
    expect(screen.getByText(/rechazó o no respondió/)).toBeInTheDocument();
  });

  it('cuenta lo que espera al administrador en la pestaña', () => {
    setup();
    draw();
    expect(screen.getByRole('tab', { name: /Esperan al administrador/ })).toHaveTextContent('1');
  });

  it('filtra por «Esperan al administrador» y lo pide a la API', async () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('tab', { name: /Esperan al administrador/ }));
    await waitFor(() => expect(state.cases).toHaveBeenLastCalledWith(expect.anything(), { pending: true }));
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

  it('sin distribuidora elegida «Correr ahora» y «Parámetros» quedan deshabilitados', () => {
    state.needsDistributor = true;
    setup();
    draw();
    expect(screen.getByRole('button', { name: 'Correr ahora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Parámetros' })).toBeDisabled();
  });

  it('un vehículo con datos de uso viejos lo dice y muestra desde cuándo', () => {
    setup({ forecast: ok({ vehicles: [{ ...FORECAST.vehicles[0], usageStale: true, lastUsageDay: '2026-10-11' }] }) });
    draw('/fleet/planner?tab=forecast');
    expect(screen.getByText(/Datos de uso desactualizados/)).toBeInTheDocument();
  });

  it('sin distribuidora elegida pide elegir una y no consulta', () => {
    state.needsDistributor = true;
    setup();
    draw();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(state.cases).not.toHaveBeenCalled();
  });
});

describe('FleetPlanner: acciones', () => {
  it('«Correr ahora» corre el planificador', () => {
    setup();
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    expect((state.run.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('avisa el resultado de la corrida', () => {
    setup();
    (state.run.mutate as ReturnType<typeof vi.fn>).mockImplementation((_v, options) => {
      (options as { onSuccess: (r: unknown) => void }).onSuccess({
        proposals: 2,
        escalated: 1,
        groundedVehicles: 1,
      });
    });
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr ahora' }));
    expect(notifications.notify.success).toHaveBeenCalledWith(expect.stringContaining('2 propuesta(s)'));
    expect(notifications.notify.success).toHaveBeenCalledWith(
      expect.stringContaining('1 vehículo(s) fuera de servicio'),
    );
  });

  it('«Parámetros» abre la configuración con los valores vigentes', async () => {
    setup();
    state.settings.mockReturnValue(
      ok({
        process: 'fleet_planner',
        title: 'Planificador de flota',
        description: '',
        fields: [
          {
            key: 'topNWindows',
            type: 'integer',
            min: 1,
            max: 10,
            default: 3,
            unit: null,
            description: 'Ventanas alternativas',
          },
        ],
        params: { topNWindows: 3 },
        isDefault: true,
        updatedAt: null,
        updatedByUserId: null,
      }),
    );
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Parámetros' }));
    expect(await screen.findByText('Parámetros del planificador')).toBeInTheDocument();
    expect(screen.getByLabelText(/Ventanas alternativas/)).toHaveValue(3);
  });
});

describe('FleetPlanner: detalle de un caso', () => {
  it('abre el caso con las ventanas ofrecidas y el cuadro de evaluadas', () => {
    setup();
    draw('/fleet/planner?case=c-1');
    expect(screen.getByText(/1\.ª alternativa/)).toBeInTheDocument();
    expect(screen.getByText('Motivo: Tengo turno médico')).toBeInTheDocument();
    expect(screen.getByText('Deja la zona bajo el mínimo de unidades')).toBeInTheDocument();
    expect(screen.getByText(/Resolvelo vos/)).toBeInTheDocument();
  });

  it('las ventanas posteriores al vencimiento se marcan urgentes', () => {
    setup();
    draw('/fleet/planner?case=c-1');
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('un caso escalado se resuelve eligiendo una ventana', () => {
    setup();
    draw('/fleet/planner?case=c-1');
    expect(screen.getByRole('button', { name: 'Elegir ventana' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar taller' })).not.toBeInTheDocument();
  });

  it('uno acordado con el chofer se confirma', () => {
    setup();
    state.detail.mockReturnValue(
      ok({
        ...DETAIL,
        status: 'awaiting_confirmation',
        escalationReason: null,
        escalationText: null,
        chosenStart: '2026-11-01T11:00:00.000Z',
        chosenEnd: '2026-11-01T16:00:00.000Z',
        chosenSource: 'driver_accepted',
      }),
    );
    draw('/fleet/planner?case=c-1');
    expect(screen.getByRole('button', { name: 'Confirmar taller' })).toBeInTheDocument();
    expect(screen.getByText(/Falta que confirmes el taller y el gasto/)).toBeInTheDocument();
  });

  it('uno programado ya no tiene acciones y lleva a la tarea para pagar', () => {
    setup();
    state.detail.mockReturnValue(
      ok({
        ...DETAIL,
        status: 'confirmed',
        chosenStart: DETAIL.windows[0].start,
        chosenEnd: DETAIL.windows[0].end,
        chosenSource: 'admin',
      }),
    );
    draw('/fleet/planner?case=c-1');
    expect(screen.queryByRole('button', { name: 'Re-planificar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a la tarea' })).toHaveAttribute('href', '/fleet/tasks/t-1');
  });

  it('cancelar pide confirmación y manda la cancelación', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    draw('/fleet/planner?case=c-1');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar caso' }));
    await waitFor(() => expect((state.cancel.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1));
    expect((state.cancel.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({ id: 'c-1', body: {} });
  });

  it('si no se confirma, no cancela ni re-planifica', async () => {
    setup();
    notifications.confirm.mockResolvedValue(false);
    draw('/fleet/planner?case=c-1');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar caso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Re-planificar' }));
    await waitFor(() => expect(notifications.confirm).toHaveBeenCalledTimes(2));
    expect((state.cancel.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    expect((state.replan.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('re-planificar manda la tarea del caso', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    draw('/fleet/planner?case=c-1');
    fireEvent.click(screen.getByRole('button', { name: 'Re-planificar' }));
    await waitFor(() => expect((state.replan.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1));
    expect((state.replan.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('t-1');
  });

  it('mientras carga el detalle muestra el esqueleto', () => {
    setup();
    state.detail.mockReturnValue(loading());
    draw('/fleet/planner?case=c-1');
    expect(screen.getByRole('status', { name: 'Cargando detalle' })).toBeInTheDocument();
  });
});

describe('FleetPlanner: próximos vencimientos', () => {
  const draw2 = () => draw('/fleet/planner?tab=forecast');

  it('muestra el consumo que explica cada fecha y por qué vence', () => {
    setup();
    draw2();
    expect(screen.getByText(/54,2 km por día de uso, estimado con 72 días con registro de uso/)).toBeInTheDocument();
    expect(screen.getByText('Faltan 500 km para los 10.500 km')).toBeInTheDocument();
    expect(screen.getByText(/Vence en 9 días/)).toBeInTheDocument();
    expect(screen.getByText('Por vencer')).toBeInTheDocument();
  });

  it('el seguro no se pasa por el taller: sin acciones y con su propio estado', () => {
    setup();
    draw2();
    expect(screen.getByText('Sin taller')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Fijar ventana' })).toHaveLength(1);
  });

  it('«Fijar ventana» abre el formulario de la tarea', () => {
    setup();
    draw2();
    fireEvent.click(screen.getByRole('button', { name: 'Fijar ventana' }));
    expect(screen.getByText('Fijar la ventana de taller')).toBeInTheDocument();
    expect(screen.getByText(/Service: aceite y filtros · AB123CD/)).toBeInTheDocument();
  });

  it('«Re-planificar» pide confirmación y manda la tarea', async () => {
    setup();
    notifications.confirm.mockResolvedValue(true);
    draw2();
    fireEvent.click(screen.getByRole('button', { name: 'Re-planificar' }));
    await waitFor(() => expect((state.replan.mutate as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1));
    expect((state.replan.mutate as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('t-1');
  });

  it('sin vehículos con tareas lo dice', () => {
    setup({ forecast: ok({ vehicles: [] }) });
    draw2();
    expect(screen.getByText('Sin vencimientos para proyectar')).toBeInTheDocument();
  });

  it('si falla la API ofrece reintentar', () => {
    const refetch = vi.fn();
    setup({ forecast: failed(refetch) });
    draw2();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalled();
  });
});
