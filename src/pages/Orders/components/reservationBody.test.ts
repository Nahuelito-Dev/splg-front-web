import { describe, expect, it } from 'vitest';
import type { NewOrderValues } from './newOrderSchema';
import { depositCapError, parseDeposit, reservationBody } from './reservationBody';

const values = {
  customerId: 'c',
  addressId: 'a',
  items: [],
  paymentMethod: 'cash',
  deliveryMode: 'standard',
  isReservation: true,
  scheduledDate: '2999-01-15',
  timeSlotId: '',
  depositAmount: '1500',
} as NewOrderValues;

describe('reservationBody (CU-072)', () => {
  it('arma los campos de la reserva con la seña como número', () => {
    expect(reservationBody(values)).toEqual({ isReservation: true, scheduledDate: '2999-01-15', depositAmount: 1500 });
  });

  it('incluye la franja si se eligió una', () => {
    expect(reservationBody({ ...values, timeSlotId: 't-1' })).toMatchObject({ timeSlotId: 't-1' });
  });

  it('un pedido común no manda nada de reserva', () => {
    expect(reservationBody({ ...values, isReservation: false })).toEqual({});
  });

  it('lee la coma decimal', () => {
    expect(parseDeposit('1500,50')).toBe(1500.5);
  });
});

describe('depositCapError (la seña no puede superar el total cotizado)', () => {
  const reservation = { isReservation: true, depositAmount: '20000' };

  it('con cotización, una seña mayor al total da el error con los dos montos', () => {
    expect(depositCapError(reservation, { total: 16700 }, null)).toMatch(/no puede superar el total del pedido/);
  });

  it('una seña igual o menor al total no da error', () => {
    expect(depositCapError({ ...reservation, depositAmount: '16700' }, { total: 16700 }, null)).toBeNull();
    expect(depositCapError({ ...reservation, depositAmount: '500' }, { total: 16700 }, null)).toBeNull();
  });

  it('si el back rechazó la cotización por el tope, usa su mismo mensaje', () => {
    const message = 'La seña ($20000.00) no puede superar el total del pedido ($16700.00)';
    expect(depositCapError(reservation, undefined, message)).toBe(message);
    expect(depositCapError(reservation, undefined, 'Stock insuficiente')).toBeNull();
  });

  it('sin reserva no valida nada', () => {
    expect(depositCapError({ isReservation: false, depositAmount: '99999' }, { total: 10 }, null)).toBeNull();
  });
});
