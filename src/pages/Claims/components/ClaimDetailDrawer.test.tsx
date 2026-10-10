import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Claim } from '../../../services/api/types';

const permissions = vi.fn();
vi.mock('../../../hooks', () => ({ usePermissions: () => permissions() as unknown }));
vi.mock('../../../services/queries/claims', () => {
  const mutation = { mutate: vi.fn(), isPending: false };
  return {
    useClaim: () => ({ data: undefined }),
    useTakeClaim: () => mutation,
    useResolveClaim: () => mutation,
    useReopenClaim: () => mutation,
  };
});
vi.mock('./ClaimHistory', () => ({ ClaimHistory: () => null }));
vi.mock('./ClaimPhoto', () => ({ ClaimPhoto: () => null }));

import { ClaimDetailDrawer } from './ClaimDetailDrawer';

const claim = (status: string) =>
  ({
    claim_id: 'c-1',
    order_id: 'o-1',
    status,
    reason: 'Roto',
    description: 'x',
    createdAt: '2026-10-01',
  }) as unknown as Claim;

const HINT = 'Elegí una distribuidora para operar';

describe('ClaimDetailDrawer', () => {
  afterEach(cleanup);

  it('sin distribuidora elegida deshabilita Tomar, Rechazar y Resolver y dice por qué', () => {
    permissions.mockReturnValue({ canOperate: false, operateHint: HINT });
    render(<ClaimDetailDrawer open onClose={vi.fn()} claim={claim('pending')} />);
    for (const name of ['Tomar', 'Rechazar', 'Resolver']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it('con distribuidora, las acciones quedan habilitadas y no hay aviso', () => {
    permissions.mockReturnValue({ canOperate: true, operateHint: undefined });
    render(<ClaimDetailDrawer open onClose={vi.fn()} claim={claim('pending')} />);
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('un reclamo resuelto se puede reabrir, pero no resolver ni pasar a en proceso', () => {
    permissions.mockReturnValue({ canOperate: true, operateHint: undefined });
    render(<ClaimDetailDrawer open onClose={vi.fn()} claim={claim('resolved')} />);
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument();
  });
});
