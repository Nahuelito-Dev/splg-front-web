import { describe, expect, it } from 'vitest';
import type { Reserva } from '../../services/api/types';
import { countPendingCashDeposits } from './reservationStats';

const reserva = (overrides: Partial<Reserva>): Reserva => ({
  id: 'r-1',
  customerName: 'Cliente de prueba',
  customerPhone: null,
  scheduledDate: '2026-10-01',
  paymentMethod: 'cash',
  total: 22600,
  depositAmount: 5000,
  depositPaid: false,
  remainingBalance: 17600,
  createdAt: '2026-09-01T00:00:00.000Z',
  items: [{ quantity: 2, type: '10kg' }],
  ...overrides,
});

describe('countPendingCashDeposits', () => {
  it('sin reservas no hay nada pendiente', () => {
    expect(countPendingCashDeposits([])).toBe(0);
  });

  it('cuenta sólo las señas en efectivo sin cobrar', () => {
    const reservations = [
      reserva({ id: 'a', paymentMethod: 'cash', depositPaid: false }),
      reserva({ id: 'b', paymentMethod: 'cash', depositPaid: true }),
      reserva({ id: 'c', paymentMethod: 'mercadopago', depositPaid: false }),
      reserva({ id: 'd', paymentMethod: 'cash', depositPaid: false }),
    ];
    expect(countPendingCashDeposits(reservations)).toBe(2);
  });
});
