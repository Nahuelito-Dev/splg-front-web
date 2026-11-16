import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateRangeFilter } from './DateRangeFilter';
import { Checkbox, Input, Select } from './Field';
import { TableToolbar } from './TableToolbar';

const downloadCsv = vi.hoisted(() => vi.fn<[string, string], void>());
vi.mock('../../../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downloadCsv,
}));

afterEach(() => {
  cleanup();
  downloadCsv.mockClear();
});

describe('TableToolbar', () => {
  it('busca, muestra los filtros y avisa lo que se escribe', () => {
    const onChange = vi.fn();
    render(
      <TableToolbar
        search={{ label: 'Buscar cosas', value: '', onChange }}
        filters={<button type="button">Filtro A</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Filtro A' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar cosas' }), { target: { value: 'ana' } });
    expect(onChange).toHaveBeenCalledWith('ana');
  });

  it('exporta el CSV desde el menú «Más»', async () => {
    render(<TableToolbar csv={{ filename: 'cosas', headers: ['A'], rows: [['1']] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Exportar CSV' }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    expect(downloadCsv.mock.calls[0]?.[0]).toMatch(/^cosas-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('sin filas la exportación queda deshabilitada', async () => {
    render(<TableToolbar csv={{ filename: 'cosas', headers: ['A'], rows: [] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(await screen.findByRole('menuitem', { name: 'Exportar CSV' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('sin acciones no hay menú «Más»', () => {
    render(<TableToolbar />);
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument();
  });

  it('con filtros activos muestra los chips; sin ellos, el conteo', () => {
    const onRemove = vi.fn();
    const { rerender } = render(
      <TableToolbar
        chips={[{ key: 'q', label: '"ana"' }]}
        onRemoveChip={onRemove}
        resultCount={3}
        noun={['cliente', 'clientes']}
      />,
    );
    expect(screen.getByText('clientes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro: Búsqueda: "ana"' }));
    expect(onRemove).toHaveBeenCalledWith('q');
    rerender(<TableToolbar resultCount={1} noun={['cliente', 'clientes']} />);
    expect(screen.getByText('cliente')).toBeInTheDocument();
  });

  it('el conteo se ve igual con y sin filtros activos: la cifra en negrita y el nombre de lo que se lista', () => {
    const { rerender } = render(<TableToolbar resultCount={16} noun={['orden', 'órdenes']} />);
    const plain = screen.getByText('16');
    expect(plain.tagName).toBe('B');
    expect(plain.parentElement).toHaveTextContent('16 órdenes');
    rerender(
      <TableToolbar
        resultCount={16}
        noun={['orden', 'órdenes']}
        chips={[{ key: 'q', label: '"ana"' }]}
        onRemoveChip={vi.fn()}
      />,
    );
    expect(screen.getByText('16').parentElement).toHaveTextContent('16 órdenes');
  });
});

describe('TableToolbar: controles de la barra', () => {
  const OPTIONS = [
    { value: '', label: 'Todos los vehículos' },
    { value: 'c1', label: 'AE774PM' },
  ];

  it('el select no lleva etiqueta visible: la dice adentro («Vehículo: …») y en aria-label, con 40 px y la flecha del kit', () => {
    const onChange = vi.fn();
    render(
      <TableToolbar
        filters={<Select label="Vehículo" options={OPTIONS} value="" onChange={(e) => void onChange(e.target.value)} />}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Vehículo' });
    expect(select).toHaveClass('h-10', 'appearance-none');
    expect(screen.queryByText('Vehículo', { selector: 'label' })).not.toBeInTheDocument();
    expect(select.parentElement).toHaveTextContent('Vehículo: Todos los vehículos');
    expect(select.parentElement?.parentElement).toHaveClass('md:min-w-[180px]', 'md:max-w-[260px]');
    fireEvent.change(select, { target: { value: 'c1' } });
    expect(onChange).toHaveBeenCalledWith('c1');
  });

  it('el texto de adentro sigue a la opción elegida', () => {
    render(<TableToolbar filters={<Select label="Vehículo" options={OPTIONS} value="c1" onChange={vi.fn()} />} />);
    expect(screen.getByRole('combobox', { name: 'Vehículo' }).parentElement).toHaveTextContent('Vehículo: AE774PM');
  });

  it('el error de un select de la barra se ve debajo y la ayuda queda como descripción', () => {
    render(
      <TableToolbar
        filters={
          <>
            <Select label="Empresa" options={OPTIONS} value="" onChange={vi.fn()} error="No se pudieron cargar" />
            <Select label="Ubicación" options={OPTIONS} value="" onChange={vi.fn()} hint="Cargando…" />
          </>
        }
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar');
    expect(screen.getByRole('combobox', { name: 'Empresa' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'Ubicación' })).toHaveAccessibleDescription('Cargando…');
  });

  it('la casilla se dibuja como chip conmutable de 40 px, sin la apariencia del navegador', () => {
    const onChange = vi.fn();
    render(
      <TableToolbar
        filters={<Checkbox label="Sólo anómalas" checked={false} onChange={(e) => void onChange(e.target.checked)} />}
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Sólo anómalas' });
    expect(box).toHaveClass('sr-only');
    expect(box.closest('label')).toHaveClass('h-10', 'rounded-[10px]', 'has-[:checked]:bg-primary-soft');
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('un campo de texto lleva la etiqueta a la vista como prefijo (también al escribir) y en aria-label', () => {
    render(
      <TableToolbar filters={<Input label="ID del recurso" placeholder="UUID" value="3f2a" onChange={vi.fn()} />} />,
    );
    const input = screen.getByRole('textbox', { name: 'ID del recurso' });
    expect(input).toHaveAttribute('placeholder', 'UUID');
    expect(input).toHaveValue('3f2a');
    const prefix = screen.getByText('ID del recurso:');
    expect(prefix.tagName).toBe('LABEL');
    expect(prefix).toBeVisible();
    expect(prefix.parentElement).toHaveClass('h-10');
    expect(prefix.parentElement).toContainElement(input);
  });

  it('orden de la fila: filtros, buscador que se estira, fechas y el ⋮ al final', () => {
    render(
      <TableToolbar
        search={{ label: 'Buscar multas', value: '', onChange: vi.fn() }}
        filters={
          <>
            <DateRangeFilter from="" to="" onChange={vi.fn()} />
            <Select label="Vehículo" options={OPTIONS} value="" onChange={vi.fn()} />
          </>
        }
        csv={{ filename: 'multas', headers: ['A'], rows: [['1']] }}
      />,
    );
    const search = screen.getByRole('searchbox', { name: 'Buscar multas' });
    expect(search).toHaveClass('h-10');
    expect(search).toHaveAttribute('placeholder', 'Buscar multas');
    const searchSlot = search.closest('label')?.parentElement;
    expect(searchSlot).toHaveClass('md:order-1', 'md:flex-1');
    const dates = screen.getByRole('button', { name: 'Fechas: sin elegir' });
    expect(dates).toHaveClass('h-10');
    expect(dates.parentElement).toHaveClass('md:order-2');
    const more = screen.getByRole('button', { name: 'Más' });
    expect(more.closest('.md\\:order-3')).toHaveClass('md:ml-auto');
  });
});

describe('Controles del kit fuera de la barra', () => {
  it('el select conserva su etiqueta visible y usa la flecha del kit, no la del navegador', () => {
    render(<Select label="Vehículo" options={[{ value: '', label: 'Todos' }]} value="" onChange={vi.fn()} />);
    expect(screen.getByText('Vehículo', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Vehículo' })).toHaveClass('appearance-none');
  });

  it('la casilla sigue siendo una casilla con su etiqueta al lado', () => {
    render(<Checkbox label="Acepto" checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Acepto' })).not.toHaveClass('sr-only');
  });

  it('sólo con el conteo y el ⋮: una fila compacta, conteo a la izquierda y ⋮ a la derecha', () => {
    render(
      <TableToolbar
        resultCount={4}
        noun={['tipo de garrafa', 'tipos de garrafa']}
        csv={{ filename: 'stock', headers: ['A'], rows: [['1']] }}
      />,
    );
    const compact = screen.getByTestId('toolbar-compact');
    expect(compact).toHaveClass('py-2');
    expect(screen.queryByTestId('toolbar-row')).toBeNull();
    const row = compact.firstElementChild as HTMLElement;
    expect(row).toHaveClass('justify-between');
    expect(row.firstElementChild).toHaveTextContent('4 tipos de garrafa');
    expect(row.lastElementChild).toContainElement(screen.getByRole('button', { name: 'Más' }));
  });

  it('sin nada que mostrar no dibuja la barra', () => {
    const { container } = render(<TableToolbar />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Select de la barra', () => {
  const OPTIONS_ALL = [
    { value: '', label: 'Todos' },
    { value: 'a', label: 'Camión A' },
    { value: 'b', label: 'Camión B' },
  ];
  const shown = () => screen.getByTestId('toolbar-select-text');

  it('no controlado (`defaultValue`): muestra la opción elegida y la sigue al cambiar', () => {
    render(<TableToolbar filters={<Select label="Vehículo" options={OPTIONS_ALL} defaultValue="b" />} />);
    expect(shown()).toHaveTextContent('Vehículo: Camión B');
    fireEvent.change(screen.getByRole('combobox', { name: 'Vehículo' }), { target: { value: 'a' } });
    expect(shown()).toHaveTextContent('Vehículo: Camión A');
  });

  it('con `register` (valor puesto por la ref, sin evento) muestra lo que tiene el select', () => {
    const register = (node: HTMLSelectElement | null) => {
      if (node) node.value = 'a';
    };
    render(<TableToolbar filters={<Select label="Vehículo" options={OPTIONS_ALL} ref={register} />} />);
    expect(shown()).toHaveTextContent('Vehículo: Camión A');
  });

  it('controlado: muestra `value` y avisa el cambio', () => {
    const onChange = vi.fn();
    render(<TableToolbar filters={<Select label="Vehículo" options={OPTIONS_ALL} value="b" onChange={onChange} />} />);
    expect(shown()).toHaveTextContent('Vehículo: Camión B');
    fireEvent.change(screen.getByRole('combobox', { name: 'Vehículo' }), { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('en contraste forzado se oculta el texto propio (queda el del select, sin superponerse)', () => {
    render(<TableToolbar filters={<Select label="Vehículo" options={OPTIONS_ALL} value="" onChange={vi.fn()} />} />);
    expect(shown()).toHaveClass('forced-colors:hidden');
  });
});
