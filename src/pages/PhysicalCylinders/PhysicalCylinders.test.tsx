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

const listCall = vi.hoisted(() => vi.fn());
vi.mock('../../services/queries/userNames', () => ({
  useUserNames: () => ({ nameOf: () => 'Ana Pérez', loading: false }),
}));
vi.mock('../../services/queries/physicalCylinders', () => ({
  useCylinders: (filters: unknown, page: unknown, term: unknown) => {
    listCall(filters, page, term);
    const state = (filters as { state?: Cylinder['state'] }).state;
    const rows = CYLINDERS.filter((c) => !state || c.state === state).filter((c) =>
      c.serial.toLowerCase().includes(String(term).toLowerCase()),
    );
    return { data: { rows, total: rows.length }, isPending: false, isFetching: false };
  },
  useCylinderStateCounts: () => ({
    all: 3,
    in_depot: 2,
    filled: 1,
    dispatched: 0,
    with_customer: 0,
    empty_returned: 0,
  }),
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
  it('muestra una pestaña por estado con su cantidad, con el total real de la API', () => {
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

  it('el pedido y el cliente de la URL se mandan como filtros a la API y quedan como chips', () => {
    renderPage(
      '/physical-cylinders?order=5baddc17-24e6-4a69-9e11-45f321956d60&customer=2e3b583d-d513-4ceb-ba14-a50f2748c522',
    );
    expect(listCall).toHaveBeenLastCalledWith(
      {
        orderId: '5baddc17-24e6-4a69-9e11-45f321956d60',
        customerUserId: '2e3b583d-d513-4ceb-ba14-a50f2748c522',
        state: undefined,
      },
      { page: 0, pageSize: 10 },
      '',
    );
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(chips).toHaveTextContent('Pedido');
    expect(chips).toHaveTextContent('Cliente: Ana Pérez');
  });

  it('un ?order= que no es UUID se ignora con un aviso y no se manda a la API', () => {
    renderPage('/physical-cylinders?order=abc&customer=xyz');
    expect(listCall).toHaveBeenLastCalledWith({ state: undefined }, { page: 0, pageSize: 10 }, '');
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('Pedido no válido');
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('Cliente no válido');
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
