import { describe, expect, it } from 'vitest';
import {
  INCIDENT_TYPE,
  labelOf,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_ORDER,
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
