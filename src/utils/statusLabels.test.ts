import { describe, expect, it } from 'vitest';
import {
  INCIDENT_TYPE,
  labelOf,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_ORDER,
  paymentFilterLabel,
  MERCADOPAGO_PAYMENT_TONE,
  mercadoPagoPaymentLabel,
  paymentStatusLabel,
  RECEIPT_STATUS,
  statusOptions,
  statusParam,
  vehicleAssignmentStatus,
} from './statusLabels';

describe('statusLabels', () => {
  it('los dos nombres de "en camino" se muestran igual', () => {
    expect(labelOf(ORDER_STATUS, 'out_for_delivery')).toEqual(labelOf(ORDER_STATUS, 'on_the_way'));
  });

  it('un valor desconocido se muestra tal cual, en neutro', () => {
    expect(labelOf(ORDER_STATUS, 'nuevo' as 'pending')).toEqual({ text: 'nuevo', tone: 'neutral' });
    expect(labelOf(ORDER_STATUS, null)).toEqual({ text: '—', tone: 'neutral' });
  });

  it('una asignación de vehículo sin `releasedAt` sigue en uso', () => {
    expect(vehicleAssignmentStatus(null)).toEqual({ text: 'En uso', tone: 'success' });
  });

  it('una asignación de vehículo con `releasedAt` ya se liberó', () => {
    expect(vehicleAssignmentStatus('2026-09-30T12:00:00.000Z')).toEqual({ text: 'Liberado', tone: 'neutral' });
  });
});

describe('estado de cobro', () => {
  it('cada estado tiene su etiqueta en castellano', () => {
    expect(labelOf(PAYMENT_STATUS, 'pending').text).toBe('Pendiente');
    expect(labelOf(PAYMENT_STATUS, 'paid').text).toBe('Cobrado');
    expect(labelOf(PAYMENT_STATUS, 'unpaid')).toEqual({ text: 'Impago', tone: 'danger' });
    expect(labelOf(PAYMENT_STATUS, 'written_off').text).toBe('Pérdida');
    expect(labelOf(INCIDENT_TYPE, 'unpaid_collection').text).toBe('Cobro impago');
  });

  it('el filtro ofrece todos los estados', () => {
    expect([...PAYMENT_STATUS_ORDER].sort()).toEqual(Object.keys(PAYMENT_STATUS).sort());
  });
});

describe('paymentStatusLabel', () => {
  it('una transferencia que no llegó es «No recibida»; el resto de los medios, «Rechazado»', () => {
    expect(paymentStatusLabel('failed', 'transfer')).toEqual({ text: 'No recibida', tone: 'danger' });
    expect(paymentStatusLabel('failed', 'mercadopago')).toEqual(labelOf(PAYMENT_STATUS, 'failed'));
    expect(paymentStatusLabel('failed')).toEqual(labelOf(PAYMENT_STATUS, 'failed'));
  });

  it('los demás estados no cambian con la transferencia', () => {
    expect(paymentStatusLabel('pending', 'transfer')).toEqual(labelOf(PAYMENT_STATUS, 'pending'));
    expect(paymentStatusLabel('paid', 'transfer')).toEqual(labelOf(PAYMENT_STATUS, 'paid'));
  });
});

describe('paymentFilterLabel', () => {
  it('el filtro de `failed` nombra los dos casos; el resto, como siempre', () => {
    expect(paymentFilterLabel('failed').text).toBe('Rechazado / no recibida');
    expect(paymentFilterLabel('unpaid')).toEqual(labelOf(PAYMENT_STATUS, 'unpaid'));
  });
});

describe('statusParam y statusOptions', () => {
  it('un estado del mapa pasa; cualquier otro valor es «todos»', () => {
    expect(statusParam(RECEIPT_STATUS, 'voided')).toBe('voided');
    expect(statusParam(RECEIPT_STATUS, 'inventado')).toBe('');
    expect(statusParam(RECEIPT_STATUS, '')).toBe('');
  });

  it('las opciones salen del mapa, con su texto y su tono', () => {
    expect(statusOptions(RECEIPT_STATUS)).toEqual([
      { value: 'confirmed', label: 'Confirmada', tone: 'success' },
      { value: 'voided', label: 'Anulada', tone: 'danger' },
    ]);
  });
});

describe('estado del pago de Mercado Pago', () => {
  it('cada uno de los nueve estados tiene su tono', () => {
    expect(Object.keys(MERCADOPAGO_PAYMENT_TONE).sort()).toEqual(
      [
        'approved',
        'authorized',
        'cancelled',
        'charged_back',
        'in_mediation',
        'in_process',
        'pending',
        'refunded',
        'rejected',
      ].sort(),
    );
  });

  it('el tono de cada estado: lo cobrado en verde; en curso o a la espera, ámbar; reclamos y contracargos, rojo; el resto, neutro', () => {
    expect(MERCADOPAGO_PAYMENT_TONE).toEqual({
      pending: 'warn',
      in_process: 'warn',
      authorized: 'warn',
      approved: 'success',
      rejected: 'danger',
      cancelled: 'neutral',
      refunded: 'neutral',
      charged_back: 'danger',
      in_mediation: 'danger',
    });
  });

  it('el texto es el del back, tal cual; el panel sólo elige el color', () => {
    expect(
      mercadoPagoPaymentLabel({
        paymentStatus: 'rejected',
        paymentStatusLabel: 'Fondos insuficientes en el medio de pago',
      }),
    ).toEqual({ text: 'Fondos insuficientes en el medio de pago', tone: 'danger' });
    expect(mercadoPagoPaymentLabel({ paymentStatus: 'approved', paymentStatusLabel: 'Pago acreditado' })).toEqual({
      text: 'Pago acreditado',
      tone: 'success',
    });
    expect(
      mercadoPagoPaymentLabel({ paymentStatus: 'in_mediation', paymentStatusLabel: 'Reclamo en curso sobre el pago' })
        ?.tone,
    ).toBe('danger');
  });

  it('M-2 / S-1: contracargo con el dinero retenido (settled) es peligro, en disputa (in_process) ámbar y reintegrado (reimbursed) neutro, como la caja', () => {
    const contracargo = (paymentStatusDetail: string) =>
      mercadoPagoPaymentLabel({
        paymentStatus: 'charged_back',
        paymentStatusDetail,
        paymentStatusLabel: 'Contracargo',
      })?.tone;
    expect(contracargo('settled')).toBe('danger');
    // S-1: la disputa abierta deja el monto en espera; la caja no se toca.
    expect(contracargo('in_process')).toBe('warn');
    expect(contracargo('reimbursed')).toBe('neutral');
  });

  it('M-1: un pedido retenido por una alerta de fraude se ve primero, en peligro', () => {
    expect(
      mercadoPagoPaymentLabel({
        paymentStatus: 'approved',
        paymentStatusLabel: 'Pago acreditado',
        paymentFraudHold: true,
      }),
    ).toEqual({ text: 'Retenido por fraude', tone: 'danger' });
  });

  it('sin estado (efectivo, transferencia o todavía sin cargar) no hay etiqueta', () => {
    expect(mercadoPagoPaymentLabel(undefined)).toBeNull();
    expect(mercadoPagoPaymentLabel({ paymentStatus: null, paymentStatusLabel: null })).toBeNull();
  });
});
