import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSummary } from '../../test/fixtures';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ load: vi.fn(), depart: vi.fn(), confirm: vi.fn(), canWrite: true }));

// La foto se pide aparte (v2) y tiene sus propios tests: acá no hace falta.
vi.mock('../../common/components/ui/EntityPhoto', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  LinkedEntityPhoto: () => null,
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: state.canWrite }),
  useBackToList: () => () => undefined,
}));
vi.mock('../../services/queries/truckLoads', () => ({
  useTruckLoad: () => state.load() as unknown,
  useDepartTruckLoad: () => state.depart() as unknown,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('./components/TruckStockCard', () => ({ TruckStockCard: () => null }));
vi.mock('./components/EditLoadItemsModal', () => ({ EditLoadItemsModal: () => null }));
vi.mock('./components/ReloadModal', () => ({
  ReloadModal: ({ open }: { open: boolean }) => (open ? <p>Reposición</p> : null),
}));
vi.mock('./components/ReturnModal', () => ({ ReturnModal: () => null }));
vi.mock('./components/CloseLoadModal', () => ({ CloseLoadModal: () => null }));
vi.mock('./components/CancelLoadModal', () => ({
  CancelLoadModal: ({ load }: { load: unknown }) => (load ? <p>Cancelar carga</p> : null),
}));

import { TruckLoadDetails } from './TruckLoadDetails';

const LOAD = (over: Record<string, unknown> = {}) => ({
  ...loadSummary(),
  notes: null,
  differenceNote: null,
  cancelReason: null,
  cash: {
    cashCollectedAmount: 40000,
    cashCollectedCount: 4,
    unpaidAmount: 0,
    unpaidCount: 0,
    pendingConfirmationAmount: 0,
    pendingConfirmationCount: 0,
  },
  items: [
    {
      itemId: 'i-1',
      gasCylinderId: 'g-1',
      gasCylinderType: '10kg',
      loadedFull: 40,
      loadedEmpty: 10,
      reloadedFull: 0,
      deliveredFull: 0,
      collectedEmpty: 0,
      expectedFull: 40,
      expectedEmpty: 10,
      declaredReturnFull: null,
      declaredReturnEmpty: null,
      differenceFull: null,
      differenceEmpty: null,
    },
  ],
  orders: [],
  movements: [],
  ...over,
});

const draw = () => renderPage(<TruckLoadDetails />, { url: '/truck-loads/tl-1', path: '/truck-loads/:id' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.canWrite = true;
});

describe('TruckLoadDetails', () => {
  it('muestra los renglones con lo esperado, el efectivo y los vacíos de pedidos y movimientos', () => {
    state.load.mockReturnValue(ok(LOAD()));
    state.depart.mockReturnValue(mutation());
    draw();
    expect(screen.getByRole('heading', { name: 'Carga N° 33' })).toBeInTheDocument();
    expect(screen.getByText(/Cargadas 40 llenas · 10 vacías/)).toBeInTheDocument();
    expect(screen.getByText('Sin entregas todavía')).toBeInTheDocument();
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument();
  });

  it('una carga abierta se despacha previa confirmación, con una clave propia de esa carga', async () => {
    const depart = mutation();
    state.load.mockReturnValue(ok(LOAD()));
    state.depart.mockReturnValue(depart);
    state.confirm.mockResolvedValue(true);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Salida' }));
    await waitFor(() => expect(depart.mutate).toHaveBeenCalled());
    expect(depart.mutate.mock.calls[0][0]).toEqual({ id: 'tl-1', scope: 'depart:tl-1' });
  });

  it('si se cancela la confirmación no despacha', async () => {
    const depart = mutation();
    state.load.mockReturnValue(ok(LOAD()));
    state.depart.mockReturnValue(depart);
    state.confirm.mockResolvedValue(false);
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Salida' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect(depart.mutate).not.toHaveBeenCalled();
  });

  it('una carga en ruta ofrece reposición y no la salida', () => {
    state.load.mockReturnValue(ok(LOAD({ status: 'on_route' })));
    state.depart.mockReturnValue(mutation());
    draw();
    expect(screen.queryByRole('button', { name: 'Salida' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reposición' }));
    expect(screen.getByText('Reposición', { selector: 'p' })).toBeInTheDocument();
  });

  it('cancelar abre el motivo', () => {
    state.load.mockReturnValue(ok(LOAD()));
    state.depart.mockReturnValue(mutation());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar' }));
    expect(screen.getByText('Cancelar carga')).toBeInTheDocument();
  });

  it('sin permiso de escritura no hay acciones', () => {
    state.canWrite = false;
    state.load.mockReturnValue(ok(LOAD()));
    state.depart.mockReturnValue(mutation());
    draw();
    expect(screen.queryByRole('button', { name: 'Salida' })).not.toBeInTheDocument();
  });

  it('un error del back se dice con Reintentar', () => {
    const refetch = vi.fn();
    state.load.mockReturnValue(failed(refetch));
    state.depart.mockReturnValue(mutation());
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no muestra la carga', () => {
    state.load.mockReturnValue(loading());
    state.depart.mockReturnValue(mutation());
    draw();
    expect(screen.queryByText(/Cargadas/)).not.toBeInTheDocument();
  });
});
