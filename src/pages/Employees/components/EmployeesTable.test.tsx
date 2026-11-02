import { cleanup, render, screen } from '@testing-library/react';
import type { GridColDef } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// La grilla de MUI no maqueta en jsdom: se evalúa el valor de cada columna, que es lo que la grilla dibuja.
// `formatDate` tiene una guarda para el YYYY-MM-DD: acá se la hace fallar para probar que la tabla usa `formatDay`.
vi.mock('../../../utils/format', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  formatDate: () => 'USÓ formatDate',
}));
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Record<string, unknown>[]; columns: GridColDef[] }) => (
    <ul>
      {rows.map((row, i) => (
        <li key={i}>
          {columns.map((c) => (
            <span key={c.field} data-field={c.field}>
              {c.valueGetter ? String((c.valueGetter as (p: unknown) => unknown)({ row })) : null}
            </span>
          ))}
        </li>
      ))}
    </ul>
  ),
}));

import { EmployeesTable } from './EmployeesTable';

afterEach(cleanup);

describe('EmployeesTable', () => {
  it('Ingreso muestra el día de calendario guardado, sin correrse al anterior', () => {
    const row = {
      employeeId: 'e-1',
      fileNumber: '0042',
      firstName: 'Pedro',
      lastName: 'Pérez',
      status: 'active',
      hireDate: '2026-11-02',
      position: { positionId: 'p-1', name: 'Chofer', category: 'driver' },
    };
    const { container } = render(
      <MemoryRouter>
        <EmployeesTable
          rows={[row] as never}
          total={1}
          loading={false}
          pagination={{ page: 0, pageSize: 10 }}
          onPaginationChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-field="hireDate"]')?.textContent).toBe('2 nov 2026');
    expect(screen.queryByText('1 nov 2026')).not.toBeInTheDocument();
  });
});
