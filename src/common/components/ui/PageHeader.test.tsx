import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
});
