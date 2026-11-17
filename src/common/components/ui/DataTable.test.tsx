import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TABLE_DENSE_KEY } from '../../../hooks/useLogout';
import { DataTable, type TableColumn } from './DataTable';
import { RowActions } from './RowActions';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [{ id: '1', name: 'Ana' }];
const columns = [{ field: 'name', headerName: 'Nombre', flex: 1 }];

const table = () => <DataTable rows={rows} columns={columns} getRowId={(r) => r.id} />;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const rowHeight = () => document.querySelector<HTMLElement>('.MuiDataGrid-row')?.style.minHeight;

describe('DataTable densidad', () => {
  it('el pie ofrece «Denso», apagado por defecto', () => {
    render(table());
    expect(screen.getByRole('switch', { name: 'Denso' })).toHaveAttribute('aria-checked', 'false');
  });

  it('al prenderlo se recuerda en el dispositivo', () => {
    render(table());
    fireEvent.click(screen.getByRole('switch', { name: 'Denso' }));
    expect(screen.getByRole('switch', { name: 'Denso' })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(TABLE_DENSE_KEY)).toBe('1');
  });

  it('la fila mide 60 px y, con «Denso», 44 px', () => {
    render(table());
    expect(rowHeight()).toBe('60px');
    fireEvent.click(screen.getByRole('switch', { name: 'Denso' }));
    expect(rowHeight()).toBe('44px');
    fireEvent.click(screen.getByRole('switch', { name: 'Denso' }));
    expect(rowHeight()).toBe('60px');
  });

  it('arranca denso si quedó guardado', () => {
    localStorage.setItem(TABLE_DENSE_KEY, '1');
    render(table());
    expect(screen.getByRole('switch', { name: 'Denso' })).toHaveAttribute('aria-checked', 'true');
  });
});

const originalMatchMedia = window.matchMedia;
/** Simula un celular: toda consulta `max-width` da verdadero. */
const phone = () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

interface Person {
  id: string;
  name: string;
  phone: string;
  zone: string;
  orders: number;
  since: string;
  status: string;
}

const people: Person[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  name: `Cliente ${i + 1}`,
  phone: `+54 376 400 00${String(i).padStart(2, '0')}`,
  zone: 'Centro',
  orders: i,
  since: '1 oct 2026',
  status: 'Activo',
}));

const personColumns: TableColumn<Person>[] = [
  { field: 'name', headerName: 'Cliente' },
  { field: 'phone', headerName: 'Teléfono' },
  { field: 'zone', headerName: 'Zona' },
  { field: 'orders', headerName: 'Pedidos', type: 'number' },
  { field: 'since', headerName: 'Alta' },
  { field: 'status', headerName: 'Estado', renderCell: ({ row }) => <span data-testid="badge">{row.status}</span> },
  {
    field: 'actions',
    headerName: '',
    renderCell: ({ row }) => <RowActions rowLabel={row.name} onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />,
  },
];

describe('DataTable vacía', () => {
  it('sin filas no dibuja encabezados ni el paginador «0–0 de 0»: sólo el vacío, de 240 px de alto', () => {
    render(<DataTable rows={[]} columns={columns} getRowId={(r: Row) => r.id} empty={<p>No hay clientes</p>} />);
    const empty = screen.getByTestId('table-empty');
    expect(empty).toHaveClass('min-h-[240px]');
    expect(empty).toHaveTextContent('No hay clientes');
    expect(screen.queryByRole('columnheader')).toBeNull();
    expect(screen.queryByText(/0–0 de 0/)).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Denso' })).toBeNull();
  });

  it('paginada en el servidor con total 0 también; mientras carga, la grilla sigue (con su esqueleto)', () => {
    const pagination = { model: { page: 0, pageSize: 10 }, onChange: vi.fn(), total: 0 };
    const { rerender } = render(
      <DataTable rows={[]} columns={columns} getRowId={(r: Row) => r.id} pagination={pagination} />,
    );
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No hay datos para mostrar');
    rerender(<DataTable rows={[]} columns={columns} getRowId={(r: Row) => r.id} pagination={pagination} loading />);
    expect(screen.queryByTestId('table-empty')).toBeNull();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
});

describe('DataTable en el celular', () => {
  beforeEach(phone);
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('pasa sola a tarjetas: título, estado y ⋯ arriba; tres datos con su etiqueta abajo', () => {
    render(<DataTable rows={people.slice(0, 1)} columns={personColumns} getRowId={(r) => r.id} label="clientes" />);
    expect(screen.queryByRole('grid')).toBeNull();
    const card = within(screen.getByRole('list', { name: 'clientes' })).getByRole('listitem');
    expect(within(card).getByText('Cliente 1')).toBeInTheDocument();
    expect(within(card).getByTestId('badge')).toHaveTextContent('Activo');
    const labels = within(card)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(labels).toEqual(['Teléfono', 'Zona', 'Pedidos']);
    expect(within(card).queryByText('Alta')).toBeNull();
    // Las acciones van todas en el ⋯.
    expect(
      within(card)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Más acciones de Cliente 1']);
    fireEvent.click(within(card).getByRole('button', { name: 'Más acciones de Cliente 1' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Ver', 'Editar', 'Eliminar']);
  });

  it('una columna con `card: false` no entra en la tarjeta', () => {
    const hidden = personColumns.map((column) =>
      column.field === 'phone' ? { ...column, card: false as const } : column,
    );
    render(<DataTable rows={people.slice(0, 1)} columns={hidden} getRowId={(r) => r.id} />);
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['Zona', 'Pedidos', 'Alta']);
  });

  it('una columna con `card: true` entra siempre, aunque haya más de tres datos', () => {
    const forced = personColumns.map((column) => (column.field === 'since' ? { ...column, card: true } : column));
    render(<DataTable rows={people.slice(0, 1)} columns={forced} getRowId={(r) => r.id} />);
    // «Alta» es el cuarto dato: con la marca desplaza al tercero sin marcar y respeta el orden de la tabla.
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(['Teléfono', 'Zona', 'Alta']);
  });

  it('con más marcadas que lugares, van todas', () => {
    const forced = personColumns.map((column) =>
      ['zone', 'orders', 'since', 'phone'].includes(column.field) ? { ...column, card: true } : column,
    );
    render(<DataTable rows={people.slice(0, 1)} columns={forced} getRowId={(r) => r.id} />);
    expect(screen.getAllByRole('term')).toHaveLength(4);
  });

  it('las tarjetas se separan por dentro (space-y-3)', () => {
    render(<DataTable rows={people.slice(0, 1)} columns={personColumns} getRowId={(r) => r.id} />);
    expect(screen.getByRole('listitem')).toHaveClass('space-y-3', 'p-4');
  });

  it('con teclado: la tarjeta toma el foco y abre el detalle con Enter o Espacio', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable rows={people.slice(0, 1)} columns={personColumns} getRowId={(r) => r.id} onRowClick={onRowClick} />,
    );
    const card = screen.getByRole('listitem');
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'a' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
    // Enter sobre el ⋯ abre el menú, no el detalle.
    fireEvent.keyDown(within(card).getByRole('button', { name: 'Más acciones de Cliente 1' }), { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('sin `onRowClick` la tarjeta no toma el foco', () => {
    render(<DataTable rows={people.slice(0, 1)} columns={personColumns} getRowId={(r) => r.id} />);
    expect(screen.getByRole('listitem')).not.toHaveAttribute('tabindex');
  });

  it('un botón o enlace propio de la tarjeta hace lo suyo, sin abrir además el detalle', () => {
    const onRowClick = vi.fn();
    const onOwn = vi.fn();
    const withButton = personColumns.map((column) =>
      column.field === 'zone'
        ? {
            ...column,
            renderCell: () => (
              <button type="button" onClick={onOwn}>
                Ver zona
              </button>
            ),
          }
        : column,
    );
    render(<DataTable rows={people.slice(0, 1)} columns={withButton} getRowId={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver zona' }));
    expect(onOwn).toHaveBeenCalledOnce();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('el clic en la tarjeta abre el detalle, como la fila', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable rows={people.slice(0, 1)} columns={personColumns} getRowId={(r) => r.id} onRowClick={onRowClick} />,
    );
    fireEvent.click(screen.getByText('Cliente 1'));
    expect(onRowClick).toHaveBeenCalledWith(people[0]);
  });

  it('sin paginación del servidor, pagina de a 10', () => {
    const onPageChange = vi.fn();
    render(<DataTable rows={people} columns={personColumns} getRowId={(r) => r.id} onPageChange={onPageChange} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(onPageChange).toHaveBeenCalledOnce();
  });

  it('con la paginación del servidor pide la página siguiente', () => {
    const onChange = vi.fn();
    render(
      <DataTable
        rows={people.slice(0, 10)}
        columns={personColumns}
        getRowId={(r) => r.id}
        pagination={{ model: { page: 0, pageSize: 10 }, onChange, total: 25 }}
      />,
    );
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onChange).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it('con selección múltiple (o `narrow="scroll"`) queda la grilla, con el degradé que avisa el desplazamiento', () => {
    render(
      <DataTable
        rows={people.slice(0, 1)}
        columns={personColumns}
        getRowId={(r) => r.id}
        selection={{ ids: [], onChange: vi.fn() }}
      />,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByTestId('table-scroll-hint')).toHaveClass('opacity-0', 'bg-gradient-to-l');
    cleanup();
    render(<DataTable rows={people.slice(0, 1)} columns={personColumns} getRowId={(r) => r.id} narrow="scroll" />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('sin filas, el mismo vacío que en escritorio', () => {
    render(<DataTable rows={[]} columns={personColumns} getRowId={(r) => r.id} />);
    expect(screen.getByTestId('table-empty')).toBeInTheDocument();
  });
});
