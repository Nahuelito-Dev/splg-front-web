import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Reserva } from '../../../services/api/types';
import { ReservationDetailDrawer } from './ReservationDetailDrawer';

afterEach(cleanup);

const reservation = (overrides: Partial<Reserva> = {}) =>
  ({
    id: 'abcdef123456',
    createdAt: '2026-10-01T10:00:00Z',
    scheduledDate: '2026-10-05',
    customerName: 'Ana Pérez',
    customerPhone: '3764',
    paymentMethod: 'cash',
    depositPaid: false,
    depositAmount: 1000,
    remainingBalance: 2000,
    total: 3000,
    items: [{ type: 'Garrafa 10 kg', quantity: 1 }],
    ...overrides,
  }) as unknown as Reserva;

const renderDrawer = (r: Reserva | null, onConfirm = vi.fn(), onClose = vi.fn()) =>
  render(
    <MemoryRouter>
      <ReservationDetailDrawer reservation={r} onClose={onClose} onConfirmDeposit={onConfirm} confirming={false} />
    </MemoryRouter>,
  );

describe('ReservationDetailDrawer', () => {
  it('es un panel lateral modal con la seña en efectivo por confirmar', () => {
    const onConfirm = vi.fn();
    renderDrawer(reservation(), onConfirm);
    expect(screen.getByRole('dialog', { name: /Reserva/ })).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar seña cobrada' }));
    expect(onConfirm).toHaveBeenCalledWith('abcdef123456');
  });

  it('con la seña paga no ofrece confirmarla y lo dice', () => {
    renderDrawer(reservation({ depositPaid: true }));
    expect(screen.queryByRole('button', { name: 'Confirmar seña cobrada' })).not.toBeInTheDocument();
    expect(screen.getByText('Seña paga')).toBeInTheDocument();
  });

  it('Esc cierra el panel', () => {
    const onClose = vi.fn();
    renderDrawer(reservation(), vi.fn(), onClose);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('sin reserva no pinta nada', () => {
    renderDrawer(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el saldo al entregar es total menos seña aunque la seña esté pendiente (el back sólo descuenta la cobrada)', () => {
    renderDrawer(reservation({ total: 16700, depositAmount: 500, remainingBalance: 16700, depositPaid: false }));
    expect(screen.getByText('Saldo al entregar').nextElementSibling).toHaveTextContent('16.200');
  });

  it('muestra la franja elegida, o que es sólo por el día', () => {
    const { unmount } = renderDrawer(
      reservation({ timeSlot: { name: 'Mañana', startTime: '08:00', endTime: '12:00' } }),
    );
    expect(screen.getByText('Mañana (08:00–12:00)')).toBeInTheDocument();
    unmount();
    renderDrawer(reservation({ timeSlot: null }));
    expect(screen.getByText('Sólo el día')).toBeInTheDocument();
  });

  it('una seña por transferencia sin cobrar se confirma a mano, con su texto', () => {
    const onConfirm = vi.fn();
    renderDrawer(reservation({ paymentMethod: 'transfer' }), onConfirm);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar transferencia recibida' }));
    expect(onConfirm).toHaveBeenCalledWith('abcdef123456');
  });

  it('una seña por MercadoPago no se confirma a mano y muestra el enlace de pago', () => {
    renderDrawer(reservation({ paymentMethod: 'mercadopago', paymentUrl: 'https://mp.test/checkout/9' }));
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(screen.getByText('https://mp.test/checkout/9')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir/ })).toHaveAttribute('href', 'https://mp.test/checkout/9');
  });

  it('una seña de MercadoPago sin enlace vigente lo explica', () => {
    renderDrawer(reservation({ paymentMethod: 'mercadopago', paymentUrl: null }));
    expect(screen.getByText(/No hay un enlace de pago vigente/)).toBeInTheDocument();
  });
});
