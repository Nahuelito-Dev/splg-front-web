import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

afterEach(cleanup);

describe('PageHeader', () => {
  it('un solo h1 por pantalla', () => {
    render(<PageHeader title="Ficha del cliente" />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('muestra el título, las etiquetas y las acciones', () => {
    render(<PageHeader title="Pedido #1" badges={<span>Pendiente</span>} actions={<button>Editar</button>} />);
    expect(screen.getByRole('heading', { name: 'Pedido #1' })).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('con una acción secundaria la deja como botón', () => {
    render(
      <PageHeader title="X" actions={<button>Nuevo</button>} secondaryActions={[{ label: 'Ver', onClick: vi.fn() }]} />,
    );
    expect(screen.getByRole('button', { name: 'Ver' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Más acciones' })).not.toBeInTheDocument();
  });

  it('con dos o más secundarias las pasa al menú ⋮ y deja la primaria a la vista', async () => {
    const onA = vi.fn();
    render(
      <PageHeader
        title="X"
        actions={<button>Nuevo</button>}
        secondaryActions={[
          { label: 'Vencimientos', onClick: onA },
          { label: 'Asignar', onClick: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vencimientos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Vencimientos' }));
    expect(onA).toHaveBeenCalledTimes(1);
  });
});
