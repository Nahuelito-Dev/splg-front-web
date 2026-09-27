import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Field';
import { IconButton } from './IconButton';
import { Switch } from './Switch';

describe('kit de UI', () => {
  it('Button: loading lo deshabilita y lo anuncia', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Button: por defecto no envía formularios', () => {
    render(<Button>Cancelar</Button>);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
  });

  it('IconButton: el label es el nombre accesible', () => {
    render(<IconButton label="Dar de baja" icon={<svg />} />);
    expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeInTheDocument();
  });

  it('Input: la etiqueta está asociada y el error se anuncia', () => {
    render(<Input label="Email" error="Email inválido" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Email inválido');
    expect(input).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
  });

  it('Badge: muestra el texto de la etiqueta', () => {
    render(<Badge label={{ text: 'Entregado', tone: 'success' }} />);
    expect(screen.getByText('Entregado')).toBeInTheDocument();
  });

  it('Switch: anuncia su estado y avisa al tocarlo', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Zona activa" />);
    const control = screen.getByRole('switch', { name: 'Zona activa' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
