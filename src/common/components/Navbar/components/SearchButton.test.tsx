import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./SearchDialog', () => ({
  SearchDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Buscador global" /> : null),
}));

import { SearchButton } from './SearchButton';

afterEach(cleanup);

describe('SearchButton: atajo ⌘K', () => {
  it('abre y cierra el buscador con ⌘K, también desde un input', () => {
    render(
      <>
        <input aria-label="otro" />
        <SearchButton />
      </>,
    );
    const input = screen.getByLabelText('otro');
    input.focus();
    fireEvent.keyDown(input, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no se abre si hay otro modal abierto', () => {
    render(
      <>
        <div role="dialog" aria-modal="true" aria-label="Otro modal" />
        <SearchButton />
      </>,
    );
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog', { name: 'Buscador global' })).not.toBeInTheDocument();
  });

  it('un popover que no es modal (selector de fechas) no bloquea el atajo', () => {
    render(
      <>
        <div role="dialog" aria-label="Elegir período" />
        <SearchButton />
      </>,
    );
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Buscador global' })).toBeInTheDocument();
  });

  it('tolera un keydown real sin `key` (autocompletado del navegador)', () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    render(<SearchButton />);
    window.dispatchEvent(new Event('keydown'));
    window.removeEventListener('error', onError);
    expect(errors).toEqual([]);
  });
});
