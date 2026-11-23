import { describe, expect, it } from 'vitest';
import type { Reserva } from '../../services/api/types';
import { countPendingManualDeposits } from './reservationStats';

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
  balanceDue: 17600,
  paymentUrl: null,
  timeSlot: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  items: [{ quantity: 2, type: '10kg' }],
  ...overrides,
});

describe('countPendingManualDeposits', () => {
  it('sin reservas no hay nada pendiente', () => {
    expect(countPendingManualDeposits([])).toBe(0);
  });

  it('cuenta las señas en efectivo sin cobrar y las de una reserva vieja por transferencia (para cerrarlas), no las de MercadoPago', () => {
    const reservations = [
      reserva({ id: 'a', paymentMethod: 'cash', depositPaid: false }),
      reserva({ id: 'b', paymentMethod: 'cash', depositPaid: true }),
      reserva({ id: 'c', paymentMethod: 'mercadopago', depositPaid: false }),
      reserva({ id: 'd', paymentMethod: 'cash', depositPaid: false }),
      reserva({ id: 'e', paymentMethod: 'transfer', depositPaid: false }),
    ];
    expect(countPendingManualDeposits(reservations)).toBe(3);
  });
});
