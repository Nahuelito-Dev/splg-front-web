import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrumbProvider } from '../CrumbProvider';
import { useCrumbLeaf } from '../useCrumbLeaf';
import { Breadcrumbs } from './Breadcrumbs';

afterEach(cleanup);

const Ficha = ({ name, onBack }: { name?: string; onBack?: () => void }) => {
  useCrumbLeaf(name, onBack);
  return <h1>Ficha</h1>;
};

const renderAt = (path: string, ficha: ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CrumbProvider>
        <Breadcrumbs />
        {ficha}
      </CrumbProvider>
    </MemoryRouter>,
  );

describe('Breadcrumbs en una ficha', () => {
  it('un solo juego de migas, con el nombre de la entidad en vez de «Detalle»', () => {
    renderAt('/customers/details/abc', <Ficha name="Ana Pérez" />);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getByText('Ana Pérez')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('Detalle')).not.toBeInTheDocument();
  });

  it('mientras la ficha no tiene nombre, queda «Detalle»', () => {
    renderAt('/customers/details/abc', <Ficha />);
    expect(screen.getByText('Detalle')).toHaveAttribute('aria-current', 'page');
  });

  it('la miga de la lista vuelve con onBack, conservando el enlace', () => {
    const onBack = vi.fn();
    renderAt('/customers/details/abc', <Ficha name="Ana Pérez" onBack={onBack} />);
    const link = screen.getByRole('link', { name: 'Clientes' });
    expect(link).toHaveAttribute('href', '/customers');
    expect(fireEvent.click(link)).toBe(false);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('con Cmd/Ctrl/Shift o clic medio el link conserva su comportamiento nativo', () => {
    const onBack = vi.fn();
    renderAt('/customers/details/abc', <Ficha name="Ana Pérez" onBack={onBack} />);
    const link = screen.getByRole('link', { name: 'Clientes' });
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(fireEvent.click(link, { shiftKey: true })).toBe(true);
    expect(fireEvent.click(link, { button: 1 })).toBe(true);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('en móvil hay un «Volver a <lista>» que usa el mismo onBack', () => {
    const onBack = vi.fn();
    renderAt('/customers/details/abc', <Ficha name="Ana Pérez" onBack={onBack} />);
    const back = screen.getByRole('link', { name: 'Volver a Clientes' });
    expect(back).toHaveAttribute('href', '/customers');
    expect(fireEvent.click(back)).toBe(false);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('en una lista (sin ficha) no hay «Volver»', () => {
    renderAt('/customers', <Ficha />);
    expect(screen.queryByRole('link', { name: /^Volver a/ })).not.toBeInTheDocument();
  });

  it('al salir de la ficha, el nombre no queda pegado', () => {
    const view = renderAt('/customers/details/abc', <Ficha name="Ana Pérez" />);
    view.rerender(
      <MemoryRouter initialEntries={['/customers/details/abc']}>
        <CrumbProvider>
          <Breadcrumbs />
        </CrumbProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
  });
});
