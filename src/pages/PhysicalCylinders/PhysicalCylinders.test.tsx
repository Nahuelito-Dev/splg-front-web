import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cylinder } from '../../services/api/types';

type BulkCall = [vars: unknown, options: { onSuccess: (result: unknown) => void }];
const bulk = vi.hoisted(() => vi.fn<BulkCall, void>());
const stop = vi.hoisted(() => vi.fn());
const busy = vi.hoisted(() => ({ value: false }));
const notifyError = vi.hoisted(() => vi.fn<[Error], void>());
const notifySuccess = vi.hoisted(() => vi.fn<[string], void>());

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: notifyError, info: vi.fn() },
  confirm: vi.fn(),
  subscribeConfirmOpen: () => () => undefined,
  isConfirmOpen: () => false,
}));

const cyl = (id: string, state: Cylinder['state'], serial: string): Cylinder =>
  ({
    cylinder_id: id,
    state,
    serial,
    deposit: 0,
    gas_cylinder: { type: 'Garrafa 10 kg', weight: 10 },
    current_customer: null,
  }) as unknown as Cylinder;
const CYLINDERS = [cyl('1', 'in_depot', 'GAS-001'), cyl('2', 'in_depot', 'GAS-002'), cyl('3', 'filled', 'GAS-003')];

vi.mock('../../services/queries/physicalCylinders', () => ({
  useCylinders: () => ({ data: CYLINDERS, isPending: false, isFetching: false }),
  useBulkTransitionCylinders: () => ({ mutate: bulk, isPending: busy.value, stop }),
}));
vi.mock('./components/AssignCylindersModal', () => ({ AssignCylindersModal: () => null }));
vi.mock('./components/CreateCylinderModal', () => ({ CreateCylinderModal: () => null }));
vi.mock('./components/TransitionModal', () => ({ TransitionModal: () => null }));

import { PhysicalCylinders } from './PhysicalCylinders';

const renderPage = (url = '/physical-cylinders') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <PhysicalCylinders />
    </MemoryRouter>,
  );
const boxes = () => screen.getAllByRole('checkbox', { name: /(select row|seleccionar fila)/i });

beforeEach(() => {
  bulk.mockReset();
  stop.mockReset();
  busy.value = false;
  notifyError.mockReset();
  notifySuccess.mockReset();
});
afterEach(cleanup);

describe('PhysicalCylinders', () => {
  it('muestra una pestaña por estado con su cantidad, calculada sobre la lista completa', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En depósito 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lleno 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Despachado 0' })).toBeInTheDocument();
  });

  it('la URL manda: ?state=filled deja sólo los llenos y la búsqueda filtra por serial', () => {
    renderPage('/physical-cylinders?state=filled');
    expect(screen.getByText('GAS-003')).toBeInTheDocument();
    expect(screen.queryByText('GAS-001')).not.toBeInTheDocument();
    cleanup();
    renderPage('/physical-cylinders?q=gas-002');
    expect(screen.getByText('GAS-002')).toBeInTheDocument();
    expect(screen.queryByText('GAS-001')).not.toBeInTheDocument();
  });

  it('marcar como llenos abre el modal del kit con la lista de lo que cambia, manda sólo los que pueden pasar y deja marcados los que no se procesaron', async () => {
    bulk.mockImplementation((_vars, options) =>
      options.onSuccess({ done: ['1'], skipped: [], failed: [{ id: '2', message: 'x' }], notRun: [] }),
    );
    renderPage();
    // Se marcan dos en depósito y el lleno: el lleno no puede pasar a "lleno" y se omite.
    for (const box of boxes()) fireEvent.click(box);
    expect(screen.getByText('3 envases seleccionados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como llenos' }));

    const dialog = screen.getByRole('dialog', { name: 'Marcar como llenos: 2 envases' });
    expect(within(dialog).getByText(/Se van a afectar \(2\)/)).toBeInTheDocument();
    expect(within(dialog).getByText('GAS-001')).toBeInTheDocument();
    expect(within(dialog).queryByText('GAS-003')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/1 de los marcados no puede pasar/)).toBeInTheDocument();
    expect(bulk).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar como llenos' }));

    expect(bulk.mock.calls[0][0]).toEqual({ ids: ['1', '2'], toState: 'filled' });
    await waitFor(() => expect(screen.getByText('1 envase seleccionado')).toBeInTheDocument());
  });

  it('cancelar el modal no llama a la API', () => {
    renderPage();
    fireEvent.click(boxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como llenos' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(bulk).not.toHaveBeenCalled();
  });

  it('cambiar de pestaña o buscar suelta la selección; sólo se actúa sobre lo visible', () => {
    renderPage();
    fireEvent.click(boxes()[0]);
    expect(screen.getByText('1 envase seleccionado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Lleno 1' }));
    expect(screen.queryByText(/seleccionados?$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Todos 3' }));
    fireEvent.click(boxes()[0]);
    fireEvent.change(screen.getByPlaceholderText(/Serial/), { target: { value: 'gas-00' } });
    expect(screen.queryByText(/seleccionados?$/)).not.toBeInTheDocument();
  });

  it('mientras corre el lote muestra "Detener"', () => {
    busy.value = true;
    renderPage();
    fireEvent.click(boxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Detener' }));
    expect(stop).toHaveBeenCalledOnce();
  });
});
