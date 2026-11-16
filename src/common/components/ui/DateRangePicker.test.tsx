import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { presetRange } from '../../../utils/dateRange';
import { DateRangePicker } from './DateRangePicker';

afterEach(cleanup);

const VALUE = { from: '2026-09-10', to: '2026-09-20' };

describe('DateRangePicker', () => {
  it('el botón muestra el rango elegido y el calendario arranca cerrado', () => {
    render(<DateRangePicker value={VALUE} onChange={vi.fn()} maxDay="2026-12-31" />);
    expect(screen.getByRole('button', { name: /Período:/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un atajo aplica el rango al instante y cierra', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={VALUE} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Período:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 7 días' }));
    expect(onChange).toHaveBeenCalledWith(presetRange('last7'), 'last7');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('personalizado: dos clics en el calendario y Aplicar', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={VALUE} onChange={onChange} maxDay="2026-12-31" />);
    fireEvent.click(screen.getByRole('button', { name: /Período:/ }));
    // Si el segundo clic es anterior al primero, se ordenan solos.
    fireEvent.click(screen.getByRole('button', { name: '16 sept 2026' }));
    expect(screen.getByText('Elegí el último día')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3 sept 2026' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-09-03', to: '2026-09-16' }, null);
  });

  it('no deja elegir días posteriores a maxDay', () => {
    render(<DateRangePicker value={VALUE} onChange={vi.fn()} maxDay="2026-09-20" />);
    fireEvent.click(screen.getByRole('button', { name: /Período:/ }));
    expect(screen.getByRole('button', { name: '21 sept 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '20 sept 2026' })).toBeEnabled();
  });

  it('Escape cierra el panel', () => {
    render(<DateRangePicker value={VALUE} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Período:/ }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el atajo elegido aunque otro atajo tenga las mismas fechas', () => {
    const day = '2026-10-01';
    render(<DateRangePicker value={{ from: day, to: day }} preset="thisMonth" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Período:/ })).toHaveTextContent('Este mes');
  });

  it('sin período el botón lo dice y «Quitar» vuelve a no filtrar', () => {
    const onClear = vi.fn();
    render(<DateRangePicker value={null} onChange={vi.fn()} emptyLabel="Fechas" />);
    expect(screen.getByRole('button', { name: 'Período: sin elegir' })).toHaveTextContent('Fechas');
    fireEvent.click(screen.getByRole('button', { name: /Período:/ }));
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
    cleanup();
    render(<DateRangePicker value={VALUE} onChange={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: /Período:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
