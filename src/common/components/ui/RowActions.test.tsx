import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Lock } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RowActions } from './RowActions';

afterEach(cleanup);

describe('RowActions', () => {
  it('muestra Ver, Editar y Eliminar en ese orden, con el nombre de la fila', () => {
    render(<RowActions rowLabel="cliente Ana" onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Ver cliente Ana', 'Editar cliente Ana', 'Eliminar cliente Ana']);
    screen.getAllByRole('button').forEach((button) => expect(button.querySelector('svg')).not.toBeNull());
  });

  it('usa el texto de baja de la pantalla', () => {
    render(<RowActions rowLabel="chofer Beto" onDelete={vi.fn()} deleteLabel="Dar de baja" />);
    expect(screen.getByRole('button', { name: 'Dar de baja chofer Beto' })).toBeInTheDocument();
  });

  it('oculta lo que no aplica, sin botones deshabilitados de relleno', () => {
    render(<RowActions rowLabel="pedido 1" onView={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Editar|Eliminar|Más acciones/ })).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar x' }));
    expect([onView, onEdit, onDelete].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
    expect(onRow).not.toHaveBeenCalled();
  });
});
