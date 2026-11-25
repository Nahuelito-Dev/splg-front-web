import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPE_OPTIONS, notificationTypeLabel } from './statusLabels';

/** Los tipos que el back registra hoy (push y correo): todos con nombre en castellano. */
const EMITIDOS = [
  'ORDER_CONFIRMATION',
  'ORDER_STATUS_UPDATE',
  'NEW_ORDER',
  'ORDER_ARRIVED',
  'CASH_READY',
  'DEPOSIT_APPROVED',
  'PAYMENT_APPROVED',
  'PAYMENT_REFUNDED',
  'EXPRESS_DEGRADED',
  'ORDER_ETA_UPDATED',
  'ORDER_TRIP_STARTED',
  'ORDER_DELIVERY_RETRY',
  'ORDER_DELIVERY_FAILED',
  'ORDER_RESCHEDULED',
  'REVISIT_NOTICE',
  'CYLINDER_RECOVERY',
  'REPURCHASE_INVITATION',
  'ROUTE_BATCH_OFFER',
  'ROUTE_SHEET_ASSIGNED',
  'ROUTE_SHEET_CHANGED',
  'ROUTE_SHEET_WAIT_EXPIRED',
  'MAINTENANCE_PROPOSAL',
  'MAINTENANCE_CONFIRMED',
  'FLEET_ALERT',
  'FLEET_EXPENSE',
  'STOCK_ALERT',
  'ADMIN_NOTIFICATION',
  'DRIVER_SETTLEMENT_PENDING',
  'ATTENDANCE_OPEN',
  'SUPPORT_NOTICE',
  'PASSWORD_RESET',
  'EMAIL_VERIFICATION',
  'EMAIL_CHANGE_NOTIFICATION',
  'WELCOME',
  'TEST',
  'UNKNOWN',
];

describe('etiquetas de los avisos', () => {
  it.each(EMITIDOS)('%s tiene nombre en castellano, no el código', (tipo) => {
    expect(notificationTypeLabel(tipo)).not.toBe(tipo);
    expect(NOTIFICATION_TYPE_OPTIONS.map((o) => o.value)).toContain(tipo);
  });

  it('un tipo desconocido se muestra tal cual', () => {
    expect(notificationTypeLabel('OTRO_TIPO')).toBe('OTRO_TIPO');
  });
});
