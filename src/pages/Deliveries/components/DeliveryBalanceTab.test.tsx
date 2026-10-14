import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../../services/api/types';

const HINT = 'Elegí una distribuidora en «Ver como» para operar';
const permissions = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('./BalanceAdjustModal', () => ({
  BalanceAdjustModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">Ajuste</div> : null),
}));

import { DeliveryBalanceTab } from './DeliveryBalanceTab';

afterEach(cleanup);
const delivery = { delivery_id: 'd-1', balance: 1000 } as unknown as Delivery;

describe('DeliveryBalanceTab: ajustar saldo', () => {
  it('sin distribuidora elegida queda bloqueado con su explicación y no abre el ajuste', () => {
    permissions.mockReturnValue({ canOperate: false, operateHint: HINT });
    render(<DeliveryBalanceTab delivery={delivery} />);
    const button = screen.getByRole('button', { name: 'Ajustar saldo' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', HINT);
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con distribuidora elegida abre el ajuste', () => {
    permissions.mockReturnValue({ canOperate: true, operateHint: undefined });
    render(<DeliveryBalanceTab delivery={delivery} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar saldo' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
