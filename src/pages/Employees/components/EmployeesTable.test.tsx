import { cleanup, render, screen } from '@testing-library/react';
import type { GridColDef } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ columns: [] as GridColDef[] }));

// La grilla de MUI no maqueta en jsdom: se evalúa el valor de cada columna, que es lo que la grilla dibuja.
// `formatDate` tiene una guarda para el YYYY-MM-DD: acá se la hace fallar para probar que la tabla usa `formatDay`.
vi.mock('../../../utils/format', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  formatDate: () => 'USÓ formatDate',
}));
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Record<string, unknown>[]; columns: GridColDef[] }) => {
    captured.columns = columns;
    return (
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
    );
  },
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

  it('Documentación dibuja la etiqueta, «Vence/Venció <fecha>» sin correrse un día y el guion del egresado', () => {
    const base = {
      fileNumber: '0042',
      firstName: 'Pedro',
      lastName: 'Pérez',
      status: 'active',
      hireDate: '2026-11-02',
      position: { positionId: 'p-1', name: 'Chofer', category: 'driver' },
    };
    const rows = [
      { ...base, employeeId: 'e-1', documentStatus: 'expired', nextDocumentDueDate: '2026-10-01' },
      { ...base, employeeId: 'e-2', documentStatus: 'due_soon', nextDocumentDueDate: '2026-11-10' },
      { ...base, employeeId: 'e-3', documentStatus: 'missing', nextDocumentDueDate: null },
      { ...base, employeeId: 'e-4', documentStatus: 'up_to_date', nextDocumentDueDate: '2027-05-10' },
      { ...base, employeeId: 'e-5', status: 'terminated', documentStatus: null, nextDocumentDueDate: null },
    ];
    render(
      <MemoryRouter>
        <EmployeesTable
          rows={rows as never}
          total={5}
          loading={false}
          pagination={{ page: 0, pageSize: 10 }}
          onPaginationChange={vi.fn()}
        />
      </MemoryRouter>,
    );
    const celdas = captured.columns.find((c) => c.field === 'documentStatus');
    const cell = (row: (typeof rows)[number]) => {
      const { container } = render(
        <MemoryRouter>{(celdas?.renderCell as (p: unknown) => ReactNode)({ row })}</MemoryRouter>,
      );
      return container.textContent;
    };
    expect(cell(rows[0])).toBe('VencidaVenció 1 oct 2026');
    expect(cell(rows[1])).toBe('Por vencerVence 10 nov 2026');
    expect(cell(rows[2])).toBe('Falta cargar');
    expect(cell(rows[3])).toBe('Al día');
    expect(cell(rows[4])).toBe('—');
  });
});
