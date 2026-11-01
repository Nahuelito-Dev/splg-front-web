import { describe, expect, it } from 'vitest';
import { notificationTarget, notificationVisuals } from './adminNotifications';

describe('notificationTarget', () => {
  it('lleva cada entidad a su pantalla', () => {
    expect(notificationTarget({ entity: 'order', id: 'o-1' })).toBe('/orders/o-1');
    expect(notificationTarget({ entity: 'claim', id: 'c-1' })).toBe('/claims?claim=c-1');
    expect(notificationTarget({ entity: 'incident', id: 'i-1' })).toBe('/incidents?incident=i-1');
  });

  it('F11: los vencimientos llevan a la tarea y los documentos faltantes al legajo', () => {
    expect(notificationTarget({ entity: 'fleet-task', id: 't1' })).toBe('/fleet/tasks/t1');
    expect(notificationTarget({ entity: 'employee', id: 'e1' })).toBe('/employees/details/e1?tab=documents');
  });

  it('F16: el planificador de taller lleva al caso, y un vehículo a su ficha', () => {
    expect(notificationTarget({ entity: 'maintenance-planner', id: 'c1' })).toBe('/fleet/planner?case=c1');
    expect(notificationTarget({ entity: 'car', id: 'v1' })).toBe('/cars/details/v1');
    expect(notificationVisuals('maintenance_escalated').tone).toBe('danger');
  });

  it('M5: el envase sin devolver que espera decisión lleva al legajo del caso', () => {
    expect(notificationTarget({ entity: 'cylinder-recovery-case', id: 'r 1' })).toBe(
      '/physical-cylinders/recovery?case=r%201',
    );
    expect(notificationVisuals('cylinder_recovery_escalated').tone).toBe('danger');
  });

  it('sin enlace o con una entidad desconocida no navega', () => {
    expect(notificationTarget(null)).toBeNull();
    expect(notificationTarget(undefined)).toBeNull();
    expect(notificationTarget({ entity: 'vehicle', id: 'v-1' })).toBeNull();
  });
});

describe('notificationVisuals', () => {
  it('F11: por vencer avisa, vencido es peligro', () => {
    expect(notificationVisuals('fleet_document_due').tone).toBe('warn');
    expect(notificationVisuals('fleet_document_expired').tone).toBe('danger');
    expect(notificationVisuals('employee_document_missing').tone).toBe('warn');
  });

  it('usa el tono de cada tipo conocido y uno genérico para el resto', () => {
    expect(notificationVisuals('refund_failed').tone).toBe('danger');
    expect(notificationVisuals('claim_created').tone).toBe('warn');
    expect(notificationVisuals('algo_nuevo')).toMatchObject({ tone: 'info' });
  });
});

describe('F14: avisos del seguro', () => {
  it('cada tipo tiene su tono: por vencer avisa, vencido es peligro', () => {
    expect(notificationVisuals('insurance_installment_due').tone).toBe('warn');
    expect(notificationVisuals('insurance_installment_overdue').tone).toBe('danger');
    expect(notificationVisuals('insurance_policy_expiring').tone).toBe('warn');
  });

  it('el seguro del vehículo abre la pestaña Seguro de su ficha', () => {
    expect(notificationTarget({ entity: 'car-insurance', id: 'car-1' })).toBe('/cars/details/car-1?tab=insurance');
  });
});

describe('F15: avisos de las multas', () => {
  it('por vencer avisa y vencida sin pagar es peligro', () => {
    expect(notificationVisuals('traffic_fine_due').tone).toBe('warn');
    expect(notificationVisuals('traffic_fine_overdue').tone).toBe('danger');
    expect(notificationVisuals('traffic_fine_due').icon).toBe(notificationVisuals('traffic_fine_overdue').icon);
  });

  it('la multa abre el drawer de esa multa en la lista', () => {
    expect(notificationTarget({ entity: 'traffic-fine', id: 'm 1' })).toBe('/fleet/fines?fine=m%201');
  });
});

describe('Etapa 3: cobros de ventas sin asentar', () => {
  it('el aviso es una advertencia y lleva a la configuración de las cajas de cobro', () => {
    expect(notificationVisuals('sales_cash_unsettled').tone).toBe('warn');
    expect(notificationTarget({ entity: 'cash-settings', id: 'd-1' })).toBe('/finance/collection-settings');
  });
});

describe('Ronda 3 de Mercado Pago: avisos de pagos', () => {
  it.each([
    ['payment_in_mediation', 'danger'],
    ['payment_chargeback_opened', 'danger'],
    ['payment_chargeback', 'danger'],
    ['payment_fraud_alert', 'danger'],
    ['payment_lookup_failed', 'danger'],
    ['payment_alert_unprocessed', 'danger'],
    ['payment_chargeback_review', 'warn'],
    ['payment_chargeback_resolved', 'success'],
    ['payment_refunded', 'warn'],
    ['payment_duplicate', 'warn'],
    ['payment_needs_review', 'warn'],
    ['payment_without_attempt', 'warn'],
  ])('%s tiene su propio ícono y tono %s (no el genérico)', (kind, tone) => {
    const visual = notificationVisuals(kind);
    expect(visual.tone).toBe(tone);
    expect(visual.icon).not.toBe(notificationVisuals('tipo_que_no_existe').icon);
  });

  it('los avisos de pago llevan al pedido', () => {
    expect(notificationTarget({ entity: 'order', id: 'o-1' })).toBe('/orders/o-1');
  });
});
