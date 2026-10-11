import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Employee } from '../../../services/api/types';

const positions = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/employees', () => ({
  useJobPositions: (...args: unknown[]) => positions(...args) as unknown,
  useCreateEmployee: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateEmployee: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { EmployeeFormModal } from './EmployeeFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EmployeeFormModal', () => {
  it('cerrado no pide los puestos (sin distribuidora elegida el back rechazaría el pedido)', () => {
    positions.mockReturnValue({ data: [], isPending: false });
    render(<EmployeeFormModal open={false} onClose={() => undefined} employee={null} />);
    expect(positions).toHaveBeenCalledWith(false);
  });

  it('al editar marca el número de legajo como obligatorio; al crear no', () => {
    positions.mockReturnValue({ data: [], isPending: false });
    const employee = { employeeId: 'e-1', fileNumber: '0042', position: { positionId: 'p' } } as unknown as Employee;
    const { rerender } = render(<EmployeeFormModal open onClose={() => undefined} employee={employee} />);
    expect(screen.getByLabelText(/Número de legajo/)).toBeRequired();
    rerender(<EmployeeFormModal open onClose={() => undefined} employee={null} />);
    expect(screen.getByLabelText(/Número de legajo/)).not.toBeRequired();
  });
});
