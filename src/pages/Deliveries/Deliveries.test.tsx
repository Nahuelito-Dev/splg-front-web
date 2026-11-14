import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../services/api/types';

const deliveriesQuery = vi.hoisted(() => vi.fn());
const permissions = vi.hoisted(() => ({ canOperate: true }));
const tableProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canWrite: permissions.canOperate,
    canOperate: permissions.canOperate,
    writeHint: permissions.canOperate ? undefined : 'Modo soporte: sólo lectura',
  }),
}));
vi.mock('../../services/queries/deliveries', () => ({
  useDeliveries: (_page: unknown, _search: string, tab: string) => deliveriesQuery(tab) as unknown,
  useDeliveryStatusCounts: () => ({ all: 5, unvalidated: 2, enabled: 4, disabled: null, online: 1 }),
  useBulkValidateDeliveries: () => ({ mutate: vi.fn(), isPending: false, stop: vi.fn() }),
  useDeleteDelivery: () => ({ mutate: vi.fn() }),
  useValidateDelivery: () => ({ mutate: vi.fn() }),
  useInvalidateDelivery: () => ({ mutate: vi.fn() }),
}));
vi.mock('./components/DeliveriesTable', () => ({
  DeliveriesTable: (props: Record<string, unknown>) => {
    tableProps.current = props;
    return null;
  },
}));
vi.mock('./components/FindDeliveryByUserModal', () => ({ FindDeliveryByUserModal: () => null }));

import { useServerExport } from '../../hooks/useServerExport';
import { Deliveries } from './Deliveries';

afterEach(() => {
  cleanup();
  permissions.canOperate = true;
});

const Search = () => <output data-testid="search">{useLocation().search}</output>;

describe('Deliveries: pestañas con contador', () => {
  it('cada grupo muestra su cantidad; uno sin dato muestra un guion, nunca 0', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: 'Todos 5' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por validar 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Deshabilitados –' })).toBeInTheDocument();
  });

  it('elegir "En línea" pide ese grupo, queda en la URL y se muestra como chip', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 1 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
        <Search />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'En línea 1' }));
    expect(deliveriesQuery).toHaveBeenLastCalledWith('online');
    expect(screen.getByTestId('search')).toHaveTextContent('?status=online');
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('En línea');
  });
});

describe('Deliveries: resumen, selección y exportación', () => {
  it('el resumen filtra por estado desde la URL', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
        <Search />
      </MemoryRouter>,
    );
    const summary = screen.getByRole('list', { name: 'Choferes por estado' });
    fireEvent.click(within(summary).getByRole('button', { name: /Habilitados/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('?status=enabled');
  });

  it('la tabla recibe selección sólo si se puede operar, y se ofrece exportar', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    const renderIt = () =>
      render(
        <MemoryRouter>
          <Deliveries />
        </MemoryRouter>,
      );
    renderIt();
    expect(tableProps.current.selection).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('menuitem', { name: 'Exportar CSV' })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Exportar Excel' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Exportar selección' })).not.toBeInTheDocument();
    cleanup();
    permissions.canOperate = false;
    renderIt();
    expect(tableProps.current.selection).toBeUndefined();
  });
});

describe('Deliveries: administrador general sin distribuidora elegida', () => {
  const renderPage = () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
      </MemoryRouter>,
    );
  };

  it('la tabla no recibe editar, dar de baja ni validar: la API contestaría 400', () => {
    permissions.canOperate = false;
    renderPage();
    expect(tableProps.current.onEdit).toBeUndefined();
    expect(tableProps.current.onDelete).toBeUndefined();
    expect(tableProps.current.onToggleValidated).toBeUndefined();
  });

  it('con distribuidora elegida sí', () => {
    renderPage();
    expect(tableProps.current.onEdit).toBeTypeOf('function');
    expect(tableProps.current.onDelete).toBeTypeOf('function');
    expect(tableProps.current.onToggleValidated).toBeTypeOf('function');
  });

  it('en la pestaña «En línea» el exporte queda bloqueado (no filtra igual que el listado)', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    render(
      <MemoryRouter initialEntries={['/deliveries?status=online']}>
        <Deliveries />
      </MemoryRouter>,
    );
    const exporte = vi.mocked(useServerExport).mock.lastCall?.[0];
    expect(exporte?.resource).toBe('choferes');
    expect(exporte?.blockedReason).toBeTruthy();
  });
});

describe('Deliveries: modo soporte (sólo lectura)', () => {
  it('«Nuevo chofer» queda apagado con el aviso', () => {
    permissions.canOperate = false;
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: /Nuevo chofer/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    permissions.canOperate = true;
  });
});
