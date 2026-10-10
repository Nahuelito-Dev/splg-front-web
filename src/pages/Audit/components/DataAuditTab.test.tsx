import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';

const entries = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/audit', () => ({
  useAuditEntries: (params: unknown) => entries(params) as unknown,
  useAuditActionTypes: () => ({ data: [] }),
}));
vi.mock('./DataAuditTable', () => ({ DataAuditTable: () => <div>tabla</div> }));

import { DataAuditTab } from './DataAuditTab';

beforeEach(() => {
  vi.useFakeTimers();
  entries.mockReset();
  entries.mockReturnValue({ data: { rows: [], total: 0 }, isFetching: false, error: null, refetch: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderTab = () =>
  render(
    <MemoryRouter>
      <DataAuditTab />
    </MemoryRouter>,
  );

describe('DataAuditTab', () => {
  it('escribir un UUID no dispara un pedido por tecla: espera a que termine y no manda el UUID a medias', () => {
    renderTab();
    const input = screen.getByLabelText('Autor (user_id)');
    for (const text of ['5', '5b', '5baddc17-24e6']) fireEvent.change(input, { target: { value: text } });
    act(() => void vi.advanceTimersByTime(600));
    const sent = entries.mock.calls.map(([p]) => (p as { userId?: string }).userId);
    expect(sent.every((u) => u === undefined)).toBe(true);
    expect(screen.getByText('UUID inválido')).toBeInTheDocument();
    expect(screen.queryByText(/Autor:/)).toBeNull();
  });

  it('un cambio de filtro llega a la API una sola vez, pasado el debounce', () => {
    renderTab();
    const before = new Set(entries.mock.calls.map(([p]) => JSON.stringify(p))).size;
    fireEvent.change(screen.getByLabelText('ID del registro'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('ID del registro'), { target: { value: 'abcd' } });
    expect(new Set(entries.mock.calls.map(([p]) => JSON.stringify(p))).size).toBe(before);
    act(() => void vi.advanceTimersByTime(600));
    expect(entries).toHaveBeenLastCalledWith(expect.objectContaining({ recordId: 'abcd' }));
    expect(entries.mock.calls.some(([p]) => (p as { recordId?: string }).recordId === 'abc')).toBe(false);
  });

  it('si la consulta falla muestra el error, no «Sin resultados»', () => {
    entries.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new ApiError(500, ['Falló el servidor']),
      refetch: vi.fn(),
    });
    renderTab();
    expect(screen.getByText('Falló el servidor')).toBeInTheDocument();
    expect(screen.queryByText('tabla')).toBeNull();
  });
});
