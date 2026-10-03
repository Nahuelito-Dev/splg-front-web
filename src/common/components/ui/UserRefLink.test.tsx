import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserRefLink } from './UserRefLink';

afterEach(cleanup);

const renderLink = (props: Partial<Parameters<typeof UserRefLink>[0]> = {}, onParentClick = vi.fn()) =>
  render(
    <MemoryRouter>
      <div onClick={onParentClick}>
        <UserRefLink userId="aaaaaaaa-0000-0000-0000-000000abc123" {...props} />
      </div>
    </MemoryRouter>,
  );

describe('UserRefLink', () => {
  it('enlaza a la ficha del usuario con su nombre', () => {
    renderLink({ name: 'Ana Pérez' });
    expect(screen.getByRole('link', { name: 'Ana Pérez' })).toHaveAttribute(
      'href',
      '/users/details/aaaaaaaa-0000-0000-0000-000000abc123',
    );
  });

  it('sin nombre muestra el id corto, o "Cargando…" mientras se resuelve', () => {
    renderLink();
    expect(screen.getByRole('link', { name: '#ABC123' })).toBeInTheDocument();
    cleanup();
    renderLink({ loading: true });
    expect(screen.getByRole('link', { name: 'Cargando…' })).toBeInTheDocument();
  });

  it('el clic no llega a la fila que lo contiene', () => {
    const onParentClick = vi.fn();
    renderLink({ name: 'Ana' }, onParentClick);
    fireEvent.click(screen.getByRole('link', { name: 'Ana' }));
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
