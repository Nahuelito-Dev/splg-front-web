import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

afterEach(cleanup);

describe('PageHeader', () => {
  it('con migas: enlaces a los niveles de arriba y la última marcada como página actual', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Ficha del cliente"
          breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Clientes', to: '/customers' }, { label: 'Ana Pérez' }]}
        />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Ruta de la ficha' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/customers');
    expect(screen.getByText('Ana Pérez')).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('una miga con onClick y sin enlace es un botón (volver a la lista conservando filtros)', () => {
    const goBack = vi.fn();
    render(
      <MemoryRouter>
        <PageHeader title="Ficha" breadcrumbs={[{ label: 'Clientes', onClick: goBack }, { label: 'Ana' }]} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(goBack).toHaveBeenCalledOnce();
  });

  it('una miga con enlace y onClick conserva el href pero vuelve con onClick, sin navegar dos veces', () => {
    const goBack = vi.fn();
    render(
      <MemoryRouter>
        <PageHeader
          title="Ficha"
          breadcrumbs={[{ label: 'Clientes', to: '/customers', onClick: goBack }, { label: 'Ana' }]}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Clientes' });
    expect(link).toHaveAttribute('href', '/customers');
    expect(fireEvent.click(link)).toBe(false);
    expect(goBack).toHaveBeenCalledOnce();
  });

  it('sin migas no dibuja la navegación', () => {
    render(<PageHeader title="Pedidos" />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
