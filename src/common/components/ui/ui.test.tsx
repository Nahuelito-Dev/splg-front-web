import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Field';
import { IconButton } from './IconButton';
import { useProfileTab } from '../../../hooks/useProfileTab';
import { ProfileTabPanel, ProfileTabs } from './ProfileTabs';
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

  it('IconButton: active marca aria-pressed; sin active no lo declara', () => {
    const { rerender } = render(<IconButton label="Ver en grilla" icon={<svg />} active />);
    expect(screen.getByRole('button', { name: 'Ver en grilla' })).toHaveAttribute('aria-pressed', 'true');
    rerender(<IconButton label="Ver en grilla" icon={<svg />} active={false} />);
    expect(screen.getByRole('button', { name: 'Ver en grilla' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<IconButton label="Ver en grilla" icon={<svg />} />);
    expect(screen.getByRole('button', { name: 'Ver en grilla' })).not.toHaveAttribute('aria-pressed');
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

  describe('ProfileTabs', () => {
    afterEach(cleanup);

    const TABS = [
      { key: 'overview', label: 'Resumen' },
      { key: 'orders', label: 'Pedidos' },
      { key: 'ratings', label: 'Calificaciones' },
    ];

    it('enlaza cada pestaña con su panel y deja una sola en el orden de tabulación', () => {
      render(
        <>
          <ProfileTabs tabs={TABS} value="orders" onChange={vi.fn()} />
          <ProfileTabPanel tabKey="orders" value="orders">
            contenido
          </ProfileTabPanel>
        </>,
      );
      const active = screen.getByRole('tab', { name: 'Pedidos' });
      expect(active).toHaveAttribute('aria-selected', 'true');
      expect(active).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('tabindex', '-1');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', active.id);
      expect(active).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    });

    it('las flechas, Inicio y Fin cambian de pestaña (con vuelta al borde)', () => {
      const onChange = vi.fn();
      render(<ProfileTabs tabs={TABS} value="overview" onChange={onChange} />);
      const first = screen.getByRole('tab', { name: 'Resumen' });
      fireEvent.keyDown(first, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenLastCalledWith('orders');
      fireEvent.keyDown(first, { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenLastCalledWith('ratings');
      fireEvent.keyDown(first, { key: 'End' });
      expect(onChange).toHaveBeenLastCalledWith('ratings');
      fireEvent.keyDown(first, { key: 'Home' });
      expect(onChange).toHaveBeenLastCalledWith('overview');
    });

    it('useProfileTab: lee ?tab=, ignora claves desconocidas y no ensucia la URL con la de por defecto', () => {
      const wrapper = (initial: string) =>
        function Wrapper({ children }: { children: ReactNode }) {
          return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
        };
      const keys = ['overview', 'orders'];
      expect(
        renderHook(() => useProfileTab(keys, 'overview'), { wrapper: wrapper('/?tab=orders') }).result.current[0],
      ).toBe('orders');
      expect(
        renderHook(() => useProfileTab(keys, 'overview'), { wrapper: wrapper('/?tab=zzz') }).result.current[0],
      ).toBe('overview');
    });
  });
});
