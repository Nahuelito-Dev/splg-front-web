import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import type { RoutePlanProposal } from '../../services/api/types';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';
import { planDay, uuid } from '../../test/routeSheetFixtures';

const state = vi.hoisted(() => ({
  needsDistributor: false,
  permiso: { allowed: true, known: true },
  day: vi.fn(),
  open: {} as Record<string, unknown>,
  propose: {} as Record<string, unknown>,
}));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: state.needsDistributor,
    canWrite: !state.needsDistributor,
    writeHint: undefined,
  }),
  usePermiso: () => state.permiso,
}));
vi.mock('../../services/queries/routeSheets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRoutePlanDay: (...args: unknown[]) => state.day(...args) as unknown,
  useRoutePlanningSettings: () => ok(undefined, { data: undefined }),
  useLateOrders: () => ok([]),
  useDissolvedRouteSheets: () => ok({ items: [], total: 0, limit: 50, offset: 0 }),
  useOpenRoutePlanDay: () => state.open,
  useProposeRoutePlan: () => state.propose,
  useConfirmAllRouteSheets: () => mutation(),
  useCloseRoutePlanDay: () => mutation(),
  useCreateRouteSheet: () => mutation(),
  useAddRouteSheetStop: () => mutation(),
  useMoveRouteSheetStop: () => mutation(),
  useStartRouteSheet: () => mutation(),
  useRouteSheetExecutions: () => [],
  useRescheduleAwaitingOrder: () => mutation(),
  useCancelAwaitingOrder: () => mutation(),
}));
const notifications = vi.hoisted(() => ({
  confirm: vi.fn(),
  notify: { success: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('../../utils/notifications', () => notifications);

import { RouteSheets } from './RouteSheets';
import { tomorrow } from './routeSheetLabels';

const proposal = (over: Partial<RoutePlanProposal> = {}): RoutePlanProposal => ({
  dryRun: true,
  candidates: 3,
  matrixSource: 'osrm',
  sheets: [
    {
      sheetId: null,
      deliveryId: uuid(10),
      carId: uuid(20),
      orderIds: [uuid(101), uuid(102)],
      distanceKm: 4.5,
      durationMin: 50,
      units: 3,
      peakUnits: 3,
      weightKg: 30,
    },
  ],
  unassigned: [{ orderId: uuid(201), reason: 'capacity' }],
  keptSheetIds: [],
  ...over,
});

beforeEach(() => {
  state.needsDistributor = false;
  state.permiso = { allowed: true, known: true };
  state.day.mockReturnValue(ok(planDay()));
  state.open = mutation();
  state.propose = mutation();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RouteSheets', () => {
  it('muestra el día con el chip de módulo inteligente, la explicación, las hojas y lo que quedó sin hoja', () => {
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(screen.getByRole('heading', { level: 1, name: 'Hojas de ruta' })).toBeInTheDocument();
    expect(screen.getByText('Módulo inteligente')).toBeInTheDocument();
    expect(screen.queryByText(/Prototipo/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/agrupando los pedidos programados por zona, franja horaria y capacidad/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Borrador · Ana Chofer/ })).toBeInTheDocument();
    expect(screen.getByText('Sin asignar (2)')).toBeInTheDocument();
    expect(screen.getByText('tiene una oferta del despacho esperando respuesta')).toBeInTheDocument();
    // El bloqueado no se puede agregar; el otro sí.
    expect(screen.getAllByRole('button', { name: 'Agregar a una hoja' })).toHaveLength(1);
  });

  it('por omisión planifica mañana', () => {
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(state.day).toHaveBeenCalledWith(tomorrow(), { enabled: true });
  });

  it('el día sin abrir (404 ROUTE_PLAN_NOT_FOUND) ofrece abrirlo', () => {
    state.day.mockReturnValue({
      ...failed(),
      error: new ApiError(404, ['No se abrió la planificación de ese día'], 'ROUTE_PLAN_NOT_FOUND'),
    });
    renderPage(<RouteSheets />, { url: '/route-sheets?date=2026-11-20' });
    expect(screen.getByText('El día no está abierto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el día' }));
    expect(state.open.mutate).toHaveBeenCalledWith('2026-11-20', expect.anything());
  });

  it('otro error del día se muestra con «Reintentar», sin asumir nada', () => {
    state.day.mockReturnValue({ ...failed(), error: new ApiError(403, ['No tenés permiso']) });
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(screen.getByText('No tenés permiso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('mientras carga no dibuja el día', () => {
    state.day.mockReturnValue(loading());
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(screen.getByText('Cargando el día…')).toBeInTheDocument();
  });

  it('«Proponer» pide la vista previa, la muestra con los motivos en castellano y recién después la crea', () => {
    const mutate = vi.fn((variables: { dryRun: boolean }, options: { onSuccess: (p: RoutePlanProposal) => void }) => {
      if (variables.dryRun) options.onSuccess(proposal());
      else options.onSuccess(proposal({ dryRun: false }));
    });
    state.propose = mutation({ mutate });
    renderPage(<RouteSheets />, { url: '/route-sheets?date=2026-11-14' });
    fireEvent.click(screen.getByRole('button', { name: 'Proponer' }));
    expect(mutate).toHaveBeenCalledWith({ date: '2026-11-14', dryRun: true }, expect.anything());
    const dialog = screen.getByRole('dialog', { name: 'Propuesta del sistema' });
    expect(within(dialog).getByText(/Hoja 1: AB123CD · Ana Chofer/)).toBeInTheDocument();
    expect(within(dialog).getByText('No entra en ningún vehículo libre (capacidad)')).toBeInTheDocument();
    expect(within(dialog).getByText('Suelto 1')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear estas hojas' }));
    expect(mutate).toHaveBeenLastCalledWith({ date: '2026-11-14', dryRun: false }, expect.anything());
    expect(notifications.notify.success).toHaveBeenCalledWith('El sistema armó 1 hoja(s) en borrador');
  });

  it('si la planificación está apagada, el 409 del back se muestra (no se asume que propuso)', () => {
    const error = new ApiError(409, ['La planificación de hojas de ruta está apagada'], 'ROUTE_PLANNING_DISABLED');
    state.propose = mutation({
      mutate: vi.fn((_: unknown, options: { onError: (e: unknown) => void }) => options.onError(error)),
    });
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    fireEvent.click(screen.getByRole('button', { name: 'Proponer' }));
    expect(notifications.notify.error).toHaveBeenCalledWith(error);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el administrador general sin distribuidora no ve el día', () => {
    state.needsDistributor = true;
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Proponer' })).toBeDisabled();
  });

  it('sin el permiso «despacho.gestionar» no pide el día ni muestra acciones', () => {
    state.permiso = { allowed: false, known: true };
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(screen.getByText('No tenés permiso para las hojas de ruta')).toBeInTheDocument();
    expect(state.day).toHaveBeenCalledWith(expect.any(String), { enabled: false });
    expect(screen.queryByRole('button', { name: 'Proponer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /más acciones/i })).not.toBeInTheDocument();
  });

  it('mientras no se saben los permisos espera, sin pedir el día', () => {
    state.permiso = { allowed: false, known: false };
    state.day.mockReturnValue(loading());
    renderPage(<RouteSheets />, { url: '/route-sheets' });
    expect(screen.getByText('Cargando el día…')).toBeInTheDocument();
    expect(state.day).toHaveBeenCalledWith(expect.any(String), { enabled: false });
  });
});
