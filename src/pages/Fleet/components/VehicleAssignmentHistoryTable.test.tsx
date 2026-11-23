import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VehicleAssignmentHistory } from '../../../services/api/types';

vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({
    rows,
    columns,
  }: {
    rows: VehicleAssignmentHistory[];
    columns: { renderCell?: (p: { row: VehicleAssignmentHistory }) => ReactNode }[];
  }) => <div>{rows.map((row) => columns[0].renderCell?.({ row }))}</div>,
}));

import { VehicleAssignmentHistoryTable } from './VehicleAssignmentHistoryTable';

afterEach(cleanup);

const row = (photoUrl: string | null) =>
  ({
    assignmentId: 'a-1',
    carId: 'car-1',
    carBrand: 'Ford',
    carModel: 'Cargo',
    carPatent: 'AB123CD',
    photoUrl,
    deliveryId: 'd-1',
    driverName: 'Beto',
    assignedAt: '2026-11-01T10:00:00.000Z',
    releasedAt: null,
    note: null,
  }) as unknown as VehicleAssignmentHistory;

const renderTable = (photoUrl: string | null) =>
  render(
    <MemoryRouter>
      <VehicleAssignmentHistoryTable
        rows={[row(photoUrl)]}
        total={1}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        variant="driver"
      />
    </MemoryRouter>,
  );

describe('VehicleAssignmentHistoryTable: foto del vehículo', () => {
  it('en la ficha del chofer muestra la foto del vehículo', () => {
    const { container } = renderTable('https://fotos.test/cargo.jpg');
    expect(container.querySelector('img[src="https://fotos.test/cargo.jpg"]')).not.toBeNull();
  });

  it('sin foto queda el ícono de auto', () => {
    const { container } = renderTable(null);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.lucide-car')).not.toBeNull();
  });
});
