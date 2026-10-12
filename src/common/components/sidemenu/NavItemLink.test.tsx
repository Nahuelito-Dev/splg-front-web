import { cleanup, render, screen } from '@testing-library/react';
import { House } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { NavItemLink } from './NavItemLink';

afterEach(cleanup);

const ITEM = { title: 'Pedidos', path: '/orders', icon: House, showPendingOrders: true };

const renderLink = (mini: boolean, pendingCount = 3) =>
  render(
    <MemoryRouter initialEntries={['/orders']}>
      <NavItemLink item={ITEM} mini={mini} pendingCount={pendingCount} />
    </MemoryRouter>,
  );

describe('NavItemLink', () => {
  it('expandido muestra el nombre y los pedidos pendientes', () => {
    renderLink(false);
    expect(screen.getByRole('link', { name: /Pedidos/ })).toHaveAttribute('href', '/orders');
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByLabelText('3 pedidos esperando chofer')).toBeInTheDocument();
  });

  it('reducido deja sólo el ícono, pero el enlace conserva su nombre accesible', () => {
    renderLink(true);
    expect(screen.queryByText('Pedidos')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedidos' })).toBeInTheDocument();
  });

  it('sin pendientes no dibuja el contador', () => {
    renderLink(false, 0);
    expect(screen.queryByLabelText(/esperando chofer/)).not.toBeInTheDocument();
  });

  it('con una ruta más específica en el menú, sólo esa queda activa (Legajos / Puestos)', () => {
    const legajos = { title: 'Legajos', path: '/employees', icon: House };
    const puestos = { title: 'Puestos', path: '/employees/positions', icon: House };
    render(
      <MemoryRouter initialEntries={['/employees/positions']}>
        <NavItemLink item={legajos} mini={false} pendingCount={0} />
        <NavItemLink item={puestos} mini={false} pendingCount={0} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Puestos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Legajos' })).not.toHaveAttribute('aria-current');
  });

  it('la ficha de un legajo sigue marcando «Legajos»', () => {
    const legajos = { title: 'Legajos', path: '/employees', icon: House };
    render(
      <MemoryRouter initialEntries={['/employees/details/e-1']}>
        <NavItemLink item={legajos} mini={false} pendingCount={0} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Legajos' })).toHaveAttribute('aria-current', 'page');
  });
});
