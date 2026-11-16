import { describe, expect, it } from 'vitest';
import type { OrderStatusHistoryEntry } from '../../../../services/api/types';
import { buildOrderHistory } from './orderHistory';

const admin = { userId: 'u-a', role: 'admin', fullName: 'Marta Ruiz' } as const;
const driver = { userId: 'u-d', role: 'delivery', fullName: null } as const;

const entry = (over: Partial<OrderStatusHistoryEntry>): OrderStatusHistoryEntry => ({
  id: 'h-1',
  fromStatus: null,
  toStatus: 'pending',
  isNote: false,
  reason: null,
  changedAt: '2026-10-01T13:00:00.000Z',
  changedBy: null,
  ...over,
});

describe('buildOrderHistory', () => {
  it('sin historial no inventa hitos', () => {
    expect(buildOrderHistory([])).toEqual([]);
  });

  it('una fila por transición, en el orden del back, y la última es el estado actual', () => {
    const items = buildOrderHistory([
      entry({ id: 'a', toStatus: 'pending', changedBy: { userId: 'u-c', role: 'customer', fullName: null } }),
      entry({ id: 'b', fromStatus: 'pending', toStatus: 'accepted', changedBy: driver }),
      entry({ id: 'c', fromStatus: 'accepted', toStatus: 'out_for_delivery', changedBy: driver }),
    ]);
    expect(items.map((i) => `${i.id}:${i.title}:${i.state}`)).toEqual([
      'a:Pedido creado:done',
      'b:Aceptado:done',
      'c:En camino:current',
    ]);
    expect(items[1].actor).toBe('Chofer');
  });

  it('una reasignación se ve: el pedido vuelve a pendiente y se acepta de nuevo, con quién', () => {
    const items = buildOrderHistory([
      entry({ id: 'a' }),
      entry({ id: 'b', fromStatus: 'pending', toStatus: 'accepted', changedBy: driver }),
      entry({ id: 'c', fromStatus: 'accepted', toStatus: 'pending', reason: 'Reasignado', changedBy: admin }),
      entry({ id: 'd', fromStatus: 'pending', toStatus: 'accepted', changedBy: admin }),
    ]);
    expect(items.map((i) => i.title)).toEqual(['Pedido creado', 'Aceptado', 'Vuelto a pendiente', 'Aceptado']);
    expect(items[2].actor).toBe('Administrador: Marta Ruiz');
    expect(items[2].note).toBe('Motivo: Reasignado');
    expect(items[3].state).toBe('current');
  });

  it('una anotación (isNote) es una nota «done»: no cambia cuál es el estado actual', () => {
    const items = buildOrderHistory([
      entry({ id: 'a', fromStatus: 'out_for_delivery', toStatus: 'delivered', changedBy: driver }),
      entry({
        id: 'b',
        fromStatus: 'delivered',
        toStatus: 'delivered',
        isNote: true,
        reason: 'Transferencia confirmada por un administrador: comprobante 123',
        changedBy: admin,
      }),
    ]);
    expect(items[0].state).toBe('current');
    expect(items[1]).toMatchObject({
      title: 'Anotación',
      state: 'done',
      actor: 'Administrador: Marta Ruiz',
      note: 'Transferencia confirmada por un administrador: comprobante 123',
    });
  });

  it('cancelado: queda como hito cancelado con quién canceló y el motivo; sin motivo lo dice', () => {
    const [conMotivo] = buildOrderHistory([
      entry({ fromStatus: 'pending', toStatus: 'cancelled', reason: 'Pidió otra fecha', changedBy: admin }),
    ]);
    expect(conMotivo).toMatchObject({ title: 'Cancelado', state: 'cancelled', note: 'Motivo: Pidió otra fecha' });
    const [sinMotivo] = buildOrderHistory([entry({ fromStatus: 'pending', toStatus: 'cancelled' })]);
    expect(sinMotivo.note).toBe('Sin motivo informado');
    expect(sinMotivo.actor).toBe('Sistema');
  });

  it('un pedido que nace reservado se titula Reservado, no «Pedido creado»', () => {
    expect(buildOrderHistory([entry({ toStatus: 'reserved' })])[0].title).toBe('Reservado');
  });
});
