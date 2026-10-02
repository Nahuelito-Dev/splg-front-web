import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Admin } from '../../../services/api/types';

const adminsQuery = vi.fn();
const useAdmins = vi.fn((distributorId?: string) => adminsQuery(distributorId) as unknown);
vi.mock('../../../services/queries/admins', () => ({ useAdmins: (id?: string) => useAdmins(id) }));

import { DistributorAdmins } from './DistributorAdmins';

const admin = (id: string, distributorId: string, name: string) =>
  ({
    admin_id: id,
    user_id: `u-${id}`,
    distributor_id: distributorId,
    user: { full_name: name, email: `${id}@splg.com`, role: { type: 'admin' } },
  }) as unknown as Admin;

describe('DistributorAdmins', () => {
  afterEach(cleanup);

  it('pide al back los administradores de esa empresa y los muestra', () => {
    adminsQuery.mockReturnValue({
      data: [admin('1', 'd-1', 'Ana Uno')],
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <DistributorAdmins distributorId="d-1" />
      </MemoryRouter>,
    );
    expect(useAdmins).toHaveBeenCalledWith('d-1');
    expect(screen.getByText('Ana Uno')).toBeInTheDocument();
  });

  it('sin administradores lo avisa, sin culpar al «Ver como»', () => {
    adminsQuery.mockReturnValue({ data: [], isPending: false, error: null, refetch: vi.fn() });
    render(
      <MemoryRouter>
        <DistributorAdmins distributorId="d-1" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Sin administradores')).toBeInTheDocument();
    expect(screen.queryByText(/Ver como/)).not.toBeInTheDocument();
  });
});
