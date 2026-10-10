import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button con motivo de bloqueo', () => {
  it('se ve apagado, expone el motivo (title y descripción), sigue enfocable y no actúa', () => {
    const onClick = vi.fn();
    render(
      <Button blockedReason="ya tiene chofer asignado" onClick={onClick}>
        Editar pedido
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Editar pedido' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'ya tiene chofer asignado');
    expect(button).toHaveAttribute('aria-description', 'ya tiene chofer asignado');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sin motivo es un botón común', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
