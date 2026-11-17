import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Lock } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RowActions, RowActionsLayoutProvider } from './RowActions';

afterEach(cleanup);

describe('RowActions', () => {
  it('muestra Ver y Editar en ese orden y deja Eliminar dentro del ⋯, al final', () => {
    render(
      <RowActions
        rowLabel="cliente Ana"
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        actions={[{ label: 'Bloquear', icon: Lock, onClick: vi.fn() }]}
      />,
    );
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Ver cliente Ana', 'Editar cliente Ana', 'Más acciones de cliente Ana']);
    screen.getAllByRole('button').forEach((button) => expect(button.querySelector('svg')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de cliente Ana' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Bloquear', 'Eliminar']);
  });

  it('el tacho nunca queda a la vista: ningún botón de la fila es de baja ni rojo', () => {
    const { container } = render(<RowActions rowLabel="cliente Ana" onView={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
    expect(container.querySelector('.text-danger')).toBeNull();
  });

  it('usa el texto de baja de la pantalla', () => {
    render(<RowActions rowLabel="chofer Beto" onDelete={vi.fn()} deleteLabel="Dar de baja" />);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de chofer Beto' }));
    expect(screen.getByRole('menuitem', { name: 'Dar de baja' })).toBeInTheDocument();
  });

  it('una baja bloqueada va al ⋯ apagada, con el motivo, y no hace nada', () => {
    const onDelete = vi.fn();
    render(<RowActions rowLabel="pedido 1" onDelete={onDelete} deleteBlockedReason="ya está entregado" />);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de pedido 1' }));
    const item = screen.getByRole('menuitem', { name: 'Eliminar (no disponible: ya está entregado)' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('en la columna de la tabla cada botón tiene su lugar: sin Editar ni ⋯, el ojo no se corre', () => {
    const { container } = render(
      <RowActionsLayoutProvider value="slots">
        <RowActions rowLabel="usuario Ana" onView={vi.fn()} />
      </RowActionsLayoutProvider>,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.children).toHaveLength(3);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(row.lastElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('fuera de la tabla no reserva lugares vacíos', () => {
    const { container } = render(<RowActions rowLabel="usuario Ana" onView={vi.fn()} />);
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(1);
  });

  it('en la tarjeta del celular todo va dentro del ⋯, también Ver y Editar', () => {
    const onView = vi.fn();
    render(
      <RowActionsLayoutProvider value="menu">
        <RowActions rowLabel="usuario Ana" onView={onView} onEdit={vi.fn()} onDelete={vi.fn()} />
      </RowActionsLayoutProvider>,
    );
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Más acciones de usuario Ana',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de usuario Ana' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Ver', 'Editar', 'Eliminar']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ver' }));
    expect(onView).toHaveBeenCalledOnce();
  });

  it('oculta lo que no aplica, sin botones deshabilitados de relleno', () => {
    render(<RowActions rowLabel="pedido 1" onView={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Editar|Eliminar|Más acciones/ })).toBeNull();
  });

  it('una edición bloqueada se ve apagada, explica por qué y no hace nada', () => {
    const onEdit = vi.fn();
    render(<RowActions rowLabel="pedido 1" onEdit={onEdit} editBlockedReason="ya tiene chofer" />);
    const button = screen.getByRole('button', { name: 'Editar pedido 1 (no disponible: ya tiene chofer)' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('las acciones extra quedan en el menú ⋯ al final', () => {
    const onClick = vi.fn();
    render(
      <RowActions rowLabel="usuario Ana" onEdit={vi.fn()} actions={[{ label: 'Bloquear', icon: Lock, onClick }]} />,
    );
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Editar usuario Ana', 'Más acciones de usuario Ana']);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de usuario Ana' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Bloquear' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('cada botón llama a lo suyo y el clic no llega a la fila', () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRow = vi.fn();
    render(
      <div onClick={onRow}>
        <RowActions rowLabel="x" onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de x' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    expect([onView, onEdit, onDelete].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
    expect(onRow).not.toHaveBeenCalled();
  });

  it('una acción del menú bloqueada se ve apagada con el motivo y no hace nada', () => {
    const onClick = vi.fn();
    render(
      <RowActions
        rowLabel="pedido #1"
        actions={[{ label: 'Asignar chofer', icon: Lock, onClick, blockedReason: 'Falta el pago' }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de pedido #1' }));
    const item = screen.getByRole('menuitem', { name: 'Asignar chofer (no disponible: Falta el pago)' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });
});
