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
