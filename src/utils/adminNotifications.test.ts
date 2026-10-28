import { describe, expect, it } from 'vitest';
import { notificationTarget, notificationVisuals } from './adminNotifications';

describe('notificationTarget', () => {
  it('lleva cada entidad a su pantalla', () => {
    expect(notificationTarget({ entity: 'order', id: 'o-1' })).toBe('/orders/o-1');
    expect(notificationTarget({ entity: 'claim', id: 'c-1' })).toBe('/claims?claim=c-1');
    expect(notificationTarget({ entity: 'incident', id: 'i-1' })).toBe('/incidents?incident=i-1');
  });

  it('sin enlace o con una entidad desconocida no navega', () => {
    expect(notificationTarget(null)).toBeNull();
    expect(notificationTarget(undefined)).toBeNull();
    expect(notificationTarget({ entity: 'vehicle', id: 'v-1' })).toBeNull();
  });
});

describe('notificationVisuals', () => {
  it('usa el tono de cada tipo conocido y uno genérico para el resto', () => {
    expect(notificationVisuals('refund_failed').tone).toBe('danger');
    expect(notificationVisuals('claim_created').tone).toBe('warn');
    expect(notificationVisuals('algo_nuevo')).toMatchObject({ tone: 'info' });
  });
});
