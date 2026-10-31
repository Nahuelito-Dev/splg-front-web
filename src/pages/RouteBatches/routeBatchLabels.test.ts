import { describe, expect, it } from 'vitest';
import type { RouteBatch } from '../../services/api/types';
import {
  canDissolve,
  formatEta,
  formatKg,
  formatSlot,
  isWithdrawn,
  liveStops,
  offerLabel,
  routePoints,
  stopCountOf,
} from './routeBatchLabels';

const stop = (sequence: number, over: Partial<RouteBatch['stops'][number]> = {}) =>
  ({
    orderId: `o-${sequence}`,
    sequence,
    active: true,
    address: { street: 'Calle', city: 'Posadas', latitude: -27.38 - sequence / 100, longitude: -55.93 },
    ...over,
  }) as RouteBatch['stops'][number];

describe('routeBatchLabels', () => {
  it('las paradas vivas salen en orden de entrega y sin las que dejaron el lote', () => {
    const batch = { stops: [stop(3), stop(1), stop(2, { active: false })] };
    expect(liveStops(batch).map((s) => s.sequence)).toEqual([1, 3]);
  });

  it('un lote vivo cuenta sus paradas vivas; uno cerrado, las que tuvo', () => {
    const stops = [stop(1), stop(2, { active: false })];
    expect(stopCountOf({ status: 'offered', stops })).toBe(1);
    expect(stopCountOf({ status: 'assigned', stops })).toBe(1);
    expect(stopCountOf({ status: 'dissolved', stops })).toBe(2);
    expect(stopCountOf({ status: 'completed', stops })).toBe(2);
  });

  it('una oferta cerrada antes de vencer, sin respuesta, se retiró; la que pasó su vigencia no respondió', () => {
    const retirada = {
      offerId: 'o',
      status: 'expired',
      expiresAt: '2026-11-01T15:10:00.000Z',
      respondedAt: '2026-11-01T15:02:00.000Z',
    };
    const vencida = { ...retirada, respondedAt: '2026-11-01T15:10:00.500Z' };
    const rechazada = { ...retirada, status: 'rejected' };
    expect(isWithdrawn(retirada as never)).toBe(true);
    expect(isWithdrawn(vencida as never)).toBe(false);
    expect(isWithdrawn(rechazada as never)).toBe(false);
    expect(offerLabel(retirada as never).text).toBe('Se retiró');
    expect(offerLabel(vencida as never).text).toBe('No respondió');
    expect(offerLabel(rechazada as never).text).toBe('Rechazó');
  });

  it('el mapa dibuja sólo las paradas vivas que tienen ubicación, numeradas', () => {
    const batch = {
      stops: [
        stop(2),
        stop(1),
        stop(3, { address: { street: 'x', city: 'y', latitude: null, longitude: null } as never }),
      ],
    };
    expect(routePoints(batch)).toEqual([
      { position: [-27.39, -55.93], sequence: 1 },
      { position: [-27.4, -55.93], sequence: 2 },
    ]);
  });

  it('sólo se deshace un lote que no tiene chofer', () => {
    expect(canDissolve('forming')).toBe(true);
    expect(canDissolve('offered')).toBe(true);
    expect(canDissolve('assigned')).toBe(false);
    expect(canDissolve('dissolved')).toBe(false);
    expect(canDissolve('completed')).toBe(false);
  });

  it('la llegada estimada se muestra en hora argentina', () => {
    expect(formatEta('2026-11-03T11:30:00.000Z')).toBe('08:30');
    expect(formatEta(null)).toBe('—');
  });

  it('la franja muestra su nombre y su horario sin segundos', () => {
    expect(formatSlot({ name: 'Mañana', startTime: '08:00:00', endTime: '12:00:00' })).toBe('Mañana · 08:00 a 12:00');
    expect(formatSlot(null)).toBe('Sin franja');
  });

  it('los kilos llevan su unidad', () => {
    expect(formatKg(25)).toBe('25 kg');
  });
});
