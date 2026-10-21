import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { presetRange } from '../../../utils/dateRange';
import { DateRangeFilter } from './DateRangeFilter';
import { DayFilter } from './DayFilter';

afterEach(cleanup);

describe('DateRangeFilter', () => {
  it('sin fechas dice «Fechas»; con una sola la muestra como «Desde …»', () => {
    const { rerender } = render(<DateRangeFilter from="" to="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Fechas/ })).toHaveTextContent('Fechas');
    rerender(<DateRangeFilter from="2026-10-01" to="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Fechas/ })).toHaveTextContent('Desde');
  });

  it('con un solo extremo «Aplicar» lo conserva: no lo pisa con hoy', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="2026-10-01" to="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '' });
  });

  it('permite un rango abierto: elegir un día y «Sólo desde este día» / «Sólo hasta este día»', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="2026-09-10" to="2026-09-20" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    fireEvent.click(screen.getByRole('button', { name: '16 sept 2026' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sólo hasta este día' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '', to: '2026-09-16' });
  });

  it('se puede quitar un solo extremo de un rango completo', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="2026-09-10" to="2026-09-20" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el fin' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-09-10', to: '' });
  });

  it('una fecha inválida (de la URL) se ignora: no rompe al abrir el calendario', () => {
    render(<DateRangeFilter from="invalid" to="" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /Fechas/ });
    expect(trigger).toHaveTextContent('Fechas');
    expect(() => fireEvent.click(trigger)).not.toThrow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('el panel se abre hacia la izquierda cuando a la derecha no entra', () => {
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ right: window.innerWidth + 300, left: 0, top: 0, bottom: 0, width: 0, height: 0 } as DOMRect);
    render(<DateRangeFilter from="2026-09-10" to="2026-09-20" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    expect(screen.getByRole('dialog')).toHaveClass('right-0');
    spy.mockRestore();
  });

  it('si a la derecha entra, se abre hacia la derecha', () => {
    render(<DateRangeFilter from="2026-09-10" to="2026-09-20" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    expect(screen.getByRole('dialog')).toHaveClass('left-0');
  });

  it('un atajo entrega el rango y «Quitar» lo vacía', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter from="2026-10-01" to="2026-10-05" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Últimos 7 días' }));
    expect(onChange).toHaveBeenLastCalledWith(presetRange('last7'));
    fireEvent.click(screen.getByRole('button', { name: /Fechas:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '', to: '' });
  });
});

describe('DayFilter', () => {
  it('un clic en el calendario elige el día y cierra; no hay atajos ni «Aplicar»', () => {
    const onChange = vi.fn();
    render(<DayFilter value="2026-09-10" onChange={onChange} maxDay="2026-12-31" />);
    fireEvent.click(screen.getByRole('button', { name: /Día:/ }));
    expect(screen.queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hoy' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '16 sept 2026' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-16');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al elegir el día el foco vuelve al botón, y también con Esc', () => {
    render(<DayFilter value="2026-09-10" onChange={vi.fn()} maxDay="2026-12-31" />);
    const trigger = screen.getByRole('button', { name: /Día:/ });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: '16 sept 2026' }));
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('sin tope se pueden elegir días futuros; con `maxDay` no', () => {
    const onChange = vi.fn();
    const { unmount } = render(<DayFilter value="2030-09-10" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Día:/ }));
    expect(screen.getByRole('button', { name: '28 sept 2030' })).toBeEnabled();
    unmount();
    render(<DayFilter value="2030-09-10" onChange={onChange} maxDay="2030-09-20" />);
    fireEvent.click(screen.getByRole('button', { name: /Día:/ }));
    expect(screen.getByRole('button', { name: '28 sept 2030' })).toBeDisabled();
  });

  it('una fecha inválida no rompe el filtro de un día', () => {
    render(<DayFilter value="invalid" onChange={vi.fn()} />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: /Día/ }))).not.toThrow();
  });

  it('«Quitar» vuelve a sin día', () => {
    const onChange = vi.fn();
    render(<DayFilter value="2026-09-10" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Día:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
