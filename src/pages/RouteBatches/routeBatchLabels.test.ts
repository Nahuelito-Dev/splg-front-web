import { describe, expect, it } from 'vitest';
import type { RouteBatch, RouteBatchRun } from '../../services/api/types';
import {
  canDissolve,
  describeRun,
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

describe('describeRun', () => {
  const none = { noDriversNearby: 0, driversNotEligible: 0, notEnoughStops: 0, lockConflict: 0 };
  const run = (over: Partial<RouteBatchRun>): RouteBatchRun => ({
    candidates: 15,
    batches: 0,
    orders: 0,
    reasons: none,
    driversNotEligibleDetail: [],
    ...over,
  });
  const ramon = { driverName: 'Ramón Villalba', reasons: ['su vehículo tiene el taller programado en este horario'] };
  const dialog = (r: RouteBatchRun) => {
    const n = describeRun(r);
    if (n.kind !== 'dialog') throw new Error('se esperaba un diálogo');
    return n;
  };

  it('ningún lote con un chofer bloqueado: título, resumen y chofer con su motivo', () => {
    expect(dialog(run({ reasons: { ...none, driversNotEligible: 15 }, driversNotEligibleDetail: [ramon] }))).toEqual({
      kind: 'dialog',
      title: 'No se armó ningún lote',
      summary: 'Había 15 pedidos candidatos.',
      driversTitle: 'Choferes que no pueden recibir el lote',
      drivers: ['Ramón Villalba: su vehículo tiene el taller programado en este horario'],
      lines: [],
    });
  });

  it('lista todos los choferes del detalle, uno por renglón, y no deja «Nombre: » colgando', () => {
    const d = dialog(
      run({
        reasons: { ...none, driversNotEligible: 15 },
        driversNotEligibleDetail: [
          { driverName: 'A', reasons: ['tiene un pedido en curso', 'sin carga'] },
          { driverName: 'B', reasons: [] },
          { driverName: 'C', reasons: ['x'] },
        ],
      }),
    );
    expect(d.drivers).toEqual(['A: tiene un pedido en curso, sin carga', 'B', 'C: x']);
    expect(d.lines).toEqual([]);
  });

  it('driversNotEligible sin detalle', () => {
    expect(dialog(run({ reasons: { ...none, driversNotEligible: 15 } })).lines).toEqual([
      'Los choferes cercanos no pueden recibir un lote ahora',
    ]);
  });

  it('noDriversNearby', () => {
    expect(dialog(run({ reasons: { ...none, noDriversNearby: 15 } })).lines).toEqual([
      'No hay choferes de la distribuidora cerca de los pedidos',
    ]);
  });

  it('notEnoughStops', () => {
    expect(dialog(run({ reasons: { ...none, notEnoughStops: 15 } })).lines).toEqual([
      'Los pedidos cercanos no llegan a 2 paradas por radio, franja o capacidad del vehículo',
    ]);
  });

  it('lockConflict', () => {
    expect(dialog(run({ reasons: { ...none, lockConflict: 15 } })).lines).toEqual([
      'Otro proceso tomó los pedidos mientras se armaba',
    ]);
  });

  it('detalle más otro motivo: choferes y renglones aparte', () => {
    const d = dialog(
      run({ reasons: { ...none, driversNotEligible: 10, notEnoughStops: 5 }, driversNotEligibleDetail: [ramon] }),
    );
    expect(d.drivers).toHaveLength(1);
    expect(d.lines).toEqual(['Los pedidos cercanos no llegan a 2 paradas por radio, franja o capacidad del vehículo']);
  });

  it('armado en parte: diálogo «Lote armado en parte» con lo armado y lo que quedó', () => {
    const d = dialog(run({ candidates: 5, batches: 1, orders: 4, reasons: { ...none, notEnoughStops: 1 } }));
    expect(d.title).toBe('Lote armado en parte');
    expect(d.summary).toBe('1 lote(s) armado(s) con 4 pedido(s) de 5 pedidos candidatos. 1 pedido quedó sin lote.');
    expect(
      dialog(run({ candidates: 6, batches: 1, orders: 4, reasons: { ...none, lockConflict: 2 } })).summary,
    ).toContain('2 pedidos quedaron sin lote.');
  });

  it('todo armado: aviso corto de éxito', () => {
    expect(describeRun(run({ candidates: 4, batches: 1, orders: 4 }))).toEqual({
      kind: 'toast',
      level: 'success',
      message: '1 lote(s) armado(s) con 4 pedido(s) de 4 pedidos candidatos',
    });
  });

  it('0 candidatos: aviso informativo; 1 candidato: diálogo en singular', () => {
    expect(describeRun(run({ candidates: 0 }))).toEqual({
      kind: 'toast',
      level: 'info',
      message: 'No hay pedidos programados para agrupar',
    });
    expect(dialog(run({ candidates: 1, reasons: { ...none, notEnoughStops: 1 } })).summary).toBe(
      'Había 1 pedido candidato.',
    );
  });
});
