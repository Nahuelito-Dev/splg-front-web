import { describe, expect, it } from 'vitest';
import type { Order } from '../../../services/api/types';
import { canRegisterCashOutcome, cashRecorded, unpaidRecorded } from './orderPayment';

type View = Pick<Order, 'status' | 'paymentMethodDetail' | 'paymentStatus'>;
const view = (over: Partial<View>): View => ({
  status: 'delivered',
  paymentMethodDetail: 'cash',
  paymentStatus: 'pending',
  ...over,
});

describe('canRegisterCashOutcome', () => {
  it('sólo con el efectivo (o una transferencia anterior) entregado y pendiente', () => {
    expect(canRegisterCashOutcome(view({}))).toBe(true);
    expect(canRegisterCashOutcome(view({ status: 'out_for_delivery' }))).toBe(false);
    expect(canRegisterCashOutcome(view({ status: 'cancelled' }))).toBe(false);
    expect(canRegisterCashOutcome(view({ paymentMethodDetail: 'transfer' }))).toBe(true);
    expect(canRegisterCashOutcome(view({ paymentMethodDetail: 'transfer', status: 'out_for_delivery' }))).toBe(false);
    expect(canRegisterCashOutcome(view({ paymentMethodDetail: 'mercadopago' }))).toBe(false);
  });

  it('un cobro ya decidido no se ofrece de nuevo (el impago se cierra con «Resolver impago»)', () => {
    for (const paymentStatus of ['paid', 'unpaid', 'written_off', 'failed'] as const) {
      expect(canRegisterCashOutcome(view({ paymentStatus }))).toBe(false);
    }
  });
});

describe('el 200 que no registró el motivo', () => {
  it('cobro en efectivo: se registró si la nota del pedido es el motivo enviado', () => {
    expect(cashRecorded({ paymentResolutionNote: 'Motivo nuevo del admin' }, 'Motivo nuevo del admin')).toBe(true);
    expect(cashRecorded({ paymentResolutionNote: 'Motivo de otro admin' }, 'Motivo nuevo del admin')).toBe(false);
    expect(cashRecorded({ paymentResolutionNote: null }, 'Motivo nuevo del admin')).toBe(false);
  });

  it('impago: se registró si la incidencia lleva el motivo enviado', () => {
    const incident = (description: string) => ({ incident: { description } }) as never;
    expect(unpaidRecorded(incident('No pagó (informado por un administrador: Motivo nuevo)'), 'Motivo nuevo')).toBe(
      true,
    );
    expect(unpaidRecorded(incident('No pagó (informado por un administrador: Otro motivo)'), 'Motivo nuevo')).toBe(
      false,
    );
  });
});
