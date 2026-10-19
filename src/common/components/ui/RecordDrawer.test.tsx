import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordDrawer } from './RecordDrawer';

afterEach(cleanup);

const renderDrawer = (props: Partial<Parameters<typeof RecordDrawer>[0]> = {}) =>
  render(
    <MemoryRouter>
      <RecordDrawer open onClose={vi.fn()} title="Pedido #ABC123" description="Hoy" {...props}>
        <p>contenido del registro</p>
      </RecordDrawer>
    </MemoryRouter>,
  );

describe('RecordDrawer', () => {
  it('es un diálogo modal con el título, las etiquetas, el contenido y el enlace a la ficha completa', () => {
    renderDrawer({
      badges: <span>Pendiente</span>,
      fullPageTo: '/orders/1',
      footer: <button type="button">Asignar</button>,
    });
    expect(screen.getByRole('dialog', { name: 'Pedido #ABC123' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('contenido del registro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asignar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir ficha completa/ })).toHaveAttribute('href', '/orders/1');
  });

  it('sin ruta de ficha no dibuja el enlace ni el pie vacío', () => {
    renderDrawer();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('mientras carga muestra un estado accesible en lugar del contenido', () => {
    renderDrawer({ loading: true });
    expect(screen.getByRole('status', { name: 'Cargando detalle' })).toBeInTheDocument();
    expect(screen.queryByText('contenido del registro')).not.toBeInTheDocument();
  });

  it('si falla la carga muestra el error con «Reintentar»', () => {
    const onRetry = vi.fn();
    renderDrawer({ error: new Error('boom'), onRetry, resource: 'El pedido' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByText('contenido del registro')).not.toBeInTheDocument();
  });

  it('el botón Cerrar y el enlace a la ficha cierran el panel', () => {
    const onClose = vi.fn();
    renderDrawer({ onClose, fullPageTo: '/orders/1' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('link', { name: /Abrir ficha completa/ }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
