import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableroBarList } from './TableroBarList';
import { TableroTimeline } from './TableroTimeline';
import { TableroWidget } from './TableroWidget';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(cleanup);

describe('widgets del tablero', () => {
  it('TableroWidget: muestra el contenido cuando todo está bien', () => {
    wrap(
      <TableroWidget title="Ventas" subtitle="Hoy">
        <p>cuerpo</p>
      </TableroWidget>,
    );
    expect(screen.getByRole('heading', { name: 'Ventas' })).toBeInTheDocument();
    expect(screen.getByText('cuerpo')).toBeInTheDocument();
  });

  it('TableroWidget: cargando muestra el esqueleto y no el contenido', () => {
    wrap(
      <TableroWidget title="Ventas" loading>
        <p>cuerpo</p>
      </TableroWidget>,
    );
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
    expect(screen.queryByText('cuerpo')).not.toBeInTheDocument();
  });

  it('TableroWidget: el error se anuncia y permite reintentar', () => {
    const retry = vi.fn();
    wrap(
      <TableroWidget title="Ventas" error={new Error('boom')} onRetry={retry}>
        <p>cuerpo</p>
      </TableroWidget>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('TableroWidget: vacío reemplaza al contenido', () => {
    wrap(
      <TableroWidget title="Ventas" empty={{ title: 'Sin ventas' }}>
        <p>cuerpo</p>
      </TableroWidget>,
    );
    expect(screen.getByText('Sin ventas')).toBeInTheDocument();
    expect(screen.queryByText('cuerpo')).not.toBeInTheDocument();
  });

  it('TableroWidget: el pie enlaza', () => {
    wrap(
      <TableroWidget title="Ventas" footer={{ label: 'Ver todo', to: '/orders' }}>
        <p>x</p>
      </TableroWidget>,
    );
    expect(screen.getByRole('link', { name: /Ver todo/ })).toHaveAttribute('href', '/orders');
  });

  it('TableroBarList: la barra más larga ocupa todo y un valor chico no desaparece', () => {
    render(
      <TableroBarList
        label="Zonas"
        items={[
          { id: 'a', label: 'Centro', value: 100, valueLabel: '100' },
          { id: 'b', label: 'Villa', value: 1, valueLabel: '1' },
          { id: 'c', label: 'Nada', value: 0, valueLabel: '0' },
        ]}
      />,
    );
    const widths = screen.getAllByRole('meter').map((m) => (m.firstElementChild as HTMLElement).style.width);
    expect(widths).toEqual(['100%', '3%', '0%']);
    expect(screen.getByRole('meter', { name: 'Centro' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('TableroTimeline: cada evento con enlace lleva a su ficha', () => {
    wrap(
      <TableroTimeline
        items={[
          { id: '1', icon: Bell, tone: 'info', title: 'Pedido creado', time: 'hace 5 minutos', to: '/orders/1' },
          { id: '2', icon: Bell, tone: 'warn', title: 'Sin enlace', detail: 'detalle', time: 'ayer' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Pedido creado/ })).toHaveAttribute('href', '/orders/1');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('detalle')).toBeInTheDocument();
  });
});
