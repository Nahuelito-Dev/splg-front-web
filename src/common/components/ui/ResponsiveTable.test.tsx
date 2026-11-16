import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponsiveTable } from './ResponsiveTable';

interface Account {
  id: string;
  name: string;
}

const rows: Account[] = [{ id: 'a-1', name: 'Almacén Norte' }];

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  // Entre 640 y 767 px (y debajo): la consulta `max-width:767px` da verdadero.
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width:767px'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  cleanup();
});

describe('ResponsiveTable en pantallas angostas', () => {
  it('la tarjeta propia lleva al detalle con clic y con teclado', () => {
    const onRowClick = vi.fn();
    render(
      <ResponsiveTable
        label="cuentas"
        rows={rows}
        columns={[{ field: 'name', headerName: 'Cuenta' }]}
        getRowId={(row) => row.id}
        renderCard={(row) => <p>{row.name}</p>}
        onRowClick={onRowClick}
      />,
    );
    const card = screen.getByRole('listitem');
    fireEvent.click(screen.getByText('Almacén Norte'));
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('sin `onRowClick` la tarjeta no es clicable ni toma el foco', () => {
    render(
      <ResponsiveTable
        label="cuentas"
        rows={rows}
        columns={[{ field: 'name', headerName: 'Cuenta' }]}
        getRowId={(row) => row.id}
        renderCard={(row) => <p>{row.name}</p>}
      />,
    );
    expect(screen.getByRole('listitem')).not.toHaveAttribute('tabindex');
    expect(screen.getByRole('listitem')).not.toHaveClass('cursor-pointer');
  });
});
