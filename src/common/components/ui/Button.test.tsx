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

describe('Button: tamaños y estados', () => {
  it('md mide 40 px y sm 32 px', () => {
    render(
      <>
        <Button>Guardar</Button>
        <Button size="sm">Editar</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass('h-10');
    expect(screen.getByRole('button', { name: 'Editar' })).toHaveClass('h-8');
  });

  it('deshabilitado se apaga con surfaceMuted y faint, sin sombra ni degradé, y muestra que no se puede', () => {
    render(<Button disabled>Guardar cambios</Button>);
    const button = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('bg-surface-muted', 'bg-none', 'text-faint', 'shadow-none', 'cursor-not-allowed');
    expect(button).not.toHaveClass('shadow-primary', 'from-primary-from', 'opacity-50');
  });

  it('con motivo de bloqueo se ve igual que deshabilitado', () => {
    render(<Button blockedReason="sin permiso">Nueva multa</Button>);
    expect(screen.getByRole('button', { name: 'Nueva multa' })).toHaveClass('bg-surface-muted', 'text-faint');
  });

  it('mientras carga conserva su color y no se puede volver a tocar', () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('from-primary-from', 'cursor-wait');
    expect(button).not.toHaveClass('bg-surface-muted');
  });
});
