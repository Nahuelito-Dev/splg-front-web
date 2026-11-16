import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../../services/api/types';

const HINT = 'Elegí una distribuidora en «Ver como» para operar';
const permissions = vi.hoisted(() => vi.fn());
const idle = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const confirmDialog = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));
vi.mock('../../../services/queries/deliveries', () => ({
  useDeleteDelivery: () => idle,
  useInvalidateDelivery: () => idle,
  useSetDeliveryEnabled: () => idle,
  useToggleDeliveryAvailability: () => idle,
  useValidateDelivery: () => idle,
}));
vi.mock('../../../utils/notifications', () => ({
  confirm: confirmDialog,
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  isConfirmOpen: () => false,
  subscribeConfirmOpen: () => () => undefined,
}));
vi.mock('./BalanceAdjustModal', () => ({ BalanceAdjustModal: () => null }));

import { DeliveryProfileCard } from './DeliveryProfileCard';

const delivery = {
  delivery_id: 'd-1',
  user_id: 'u-1',
  user: { full_name: 'Luis Gómez', email: 'luis@x.com', photoUrl: null },
  balance: 0,
  calification: null,
  createdAt: '2026-09-01T10:00:00Z',
  validated: false,
  isEnabled: true,
  isAvailable: false,
} as unknown as Delivery;

const ACTIONS = ['Editar', 'Validar', 'Deshabilitar', 'Conectar', 'Ajustar saldo', 'Dar de baja'];

beforeEach(() => {
  idle.mutate.mockReset();
  confirmDialog.mockReset().mockResolvedValue(true);
});
afterEach(cleanup);

describe('DeliveryProfileCard: administrador general sin distribuidora elegida', () => {
  it('todas las escrituras sobre el chofer quedan bloqueadas con su explicación y no hacen nada', () => {
    permissions.mockReturnValue({ canOperate: false, operateHint: HINT });
    render(
      <MemoryRouter>
        <DeliveryProfileCard delivery={delivery} onDeleted={vi.fn()} />
      </MemoryRouter>,
    );
    for (const name of ACTIONS) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('title', HINT);
      fireEvent.click(button);
    }
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(idle.mutate).not.toHaveBeenCalled();
  });

  it('con distribuidora elegida las acciones están habilitadas', () => {
    permissions.mockReturnValue({ canOperate: true, operateHint: undefined });
    render(
      <MemoryRouter>
        <DeliveryProfileCard delivery={delivery} onDeleted={vi.fn()} />
      </MemoryRouter>,
    );
    for (const name of ACTIONS) expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));
    expect(idle.mutate).toHaveBeenCalledTimes(1);
  });
});
