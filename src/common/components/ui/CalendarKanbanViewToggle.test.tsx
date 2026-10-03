import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarKanbanViewToggle } from './CalendarKanbanViewToggle';

afterEach(cleanup);

const OPTIONS = [
  { id: 'list', label: 'Lista' },
  { id: 'calendar', label: 'Calendario' },
];

describe('CalendarKanbanViewToggle', () => {
  it('marca la vista activa y avisa el cambio', () => {
    const onChange = vi.fn();
    render(<CalendarKanbanViewToggle options={OPTIONS} value="list" onChange={onChange} label="Vista" />);
    expect(screen.getByRole('group', { name: 'Vista' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Calendario' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Calendario' }));
    expect(onChange).toHaveBeenCalledWith('calendar');
  });
});
