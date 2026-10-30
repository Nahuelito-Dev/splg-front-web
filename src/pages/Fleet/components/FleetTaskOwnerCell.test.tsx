import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FleetTask } from '../../../services/api/types';
import { usePersonPhoto } from '../../../services/queries/peoplePhotos';
import { FleetTaskOwnerCell } from './FleetTaskOwnerCell';

vi.mock('../../../services/queries/employees', () => ({
  useEmployee: () => ({ data: { firstName: 'Eva', lastName: 'Luna', fileNumber: '0007' } }),
}));

afterEach(cleanup);

const owners = { carMap: new Map(), driverMap: new Map() } as unknown as Parameters<typeof FleetTaskOwnerCell>[0];

describe('FleetTaskOwnerCell: fotos', () => {
  it('el legajo de una tarea de personal pide su foto por employeeId', () => {
    vi.mocked(usePersonPhoto).mockClear();
    render(<FleetTaskOwnerCell {...owners} task={{ employeeId: 'emp-1' } as FleetTask} />);
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'employee', id: 'emp-1' });
  });

  it('el chofer de una tarea pide su foto por el user_id de su cuenta', () => {
    vi.mocked(usePersonPhoto).mockClear();
    const driverMap = new Map([['deliv-1', { user_id: 'user-9', user: { full_name: 'Beto' } }]]);
    render(
      <FleetTaskOwnerCell
        {...owners}
        driverMap={driverMap as unknown as typeof owners.driverMap}
        task={{ deliveryId: 'deliv-1' } as FleetTask}
      />,
    );
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'user', id: 'user-9' });
  });
});
