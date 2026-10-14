import { describe, expect, it } from 'vitest';
import type { Order } from '../../../services/api/types';
import {
  canConfirmTransferReceived,
  canMarkTransferNotReceived,
  canRegisterCashOutcome,
  cashOrTransferRecorded,
  unpaidRecorded,
} from './orderPayment';

type View = Pick<Order, 'status' | 'paymentMethodDetail' | 'paymentStatus'>;
const view = (over: Partial<View>): View => ({
  status: 'delivered',
  paymentMethodDetail: 'cash',
  paymentStatus: 'pending',
  ...over,
});

describe('canRegisterCashOutcome', () => {
  it('sólo con el efectivo entregado y pendiente', () => {
    expect(canRegisterCashOutcome(view({}))).toBe(true);
    expect(canRegisterCashOutcome(view({ status: 'out_for_delivery' }))).toBe(false);
    expect(canRegisterCashOutcome(view({ status: 'cancelled' }))).toBe(false);
    expect(canRegisterCashOutcome(view({ paymentMethodDetail: 'transfer' }))).toBe(false);
    expect(canRegisterCashOutcome(view({ paymentMethodDetail: 'mercadopago' }))).toBe(false);
  });

  it('un cobro ya decidido no se ofrece de nuevo (el impago se cierra con «Resolver impago»)', () => {
    for (const paymentStatus of ['paid', 'unpaid', 'written_off', 'failed'] as const) {
      expect(canRegisterCashOutcome(view({ paymentStatus }))).toBe(false);
    }
  });
});

describe('canConfirmTransferReceived', () => {
  const transfer = (over: Partial<View>) => view({ paymentMethodDetail: 'transfer', ...over });

  it('vale desde pendiente y desde rechazada (llegó después), antes o después de entregar', () => {
    expect(canConfirmTransferReceived(transfer({ paymentStatus: 'pending' }))).toBe(true);
    expect(canConfirmTransferReceived(transfer({ paymentStatus: 'pending', status: 'pending' }))).toBe(true);
    expect(canConfirmTransferReceived(transfer({ paymentStatus: 'failed' }))).toBe(true);
  });

  it('no sobre una ya cobrada, un pedido cancelado ni otro medio de pago', () => {
    expect(canConfirmTransferReceived(transfer({ paymentStatus: 'paid' }))).toBe(false);
    expect(canConfirmTransferReceived(transfer({ status: 'cancelled' }))).toBe(false);
    expect(canConfirmTransferReceived(view({}))).toBe(false);
  });
});

describe('canMarkTransferNotReceived', () => {
  const transfer = (over: Partial<View>) => view({ paymentMethodDetail: 'transfer', ...over });

  it('sólo sobre un pedido entregado con el pago pendiente', () => {
    expect(canMarkTransferNotReceived(transfer({}))).toBe(true);
    expect(canMarkTransferNotReceived(transfer({ status: 'out_for_delivery' }))).toBe(false);
    expect(canMarkTransferNotReceived(transfer({ status: 'cancelled' }))).toBe(false);
  });

  it('paid → failed es 409 en el back: no se ofrece, y failed ya está decidida', () => {
    expect(canMarkTransferNotReceived(transfer({ paymentStatus: 'paid' }))).toBe(false);
    expect(canMarkTransferNotReceived(transfer({ paymentStatus: 'failed' }))).toBe(false);
  });
});

describe('el 200 que no registró el motivo', () => {
  it('cobro en efectivo y transferencia: se registró si la nota del pedido es el motivo enviado', () => {
    expect(cashOrTransferRecorded({ paymentResolutionNote: 'Motivo nuevo del admin' }, 'Motivo nuevo del admin')).toBe(
      true,
    );
    expect(cashOrTransferRecorded({ paymentResolutionNote: 'Motivo de otro admin' }, 'Motivo nuevo del admin')).toBe(
      false,
    );
    expect(cashOrTransferRecorded({ paymentResolutionNote: null }, 'Motivo nuevo del admin')).toBe(false);
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
