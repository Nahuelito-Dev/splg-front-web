import { describe, expect, it } from 'vitest';
import { labelOf, ORDER_STATUS, vehicleAssignmentStatus } from './statusLabels';

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
