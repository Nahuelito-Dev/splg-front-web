import { describe, expect, it } from 'vitest';
import { msg, ticket } from '../../test/chatFixtures';
import { buildTimeline } from './timeline';

const change = (seq: number, from: string, to: string, at: string) =>
  msg(seq, {
    kind: 'system',
    party: 'system',
    systemCode: 'ticket_status_changed',
    payload: { from, to },
    createdAt: at,
  });

describe('línea de tiempo del ticket', () => {
  it('creado, primera respuesta y cada cambio de estado, en orden', () => {
    const t = ticket({
      status: 'closed',
      createdAt: '2026-11-10T10:00:00.000Z',
      firstResponseAt: '2026-11-10T11:00:00.000Z',
      resolvedAt: '2026-11-11T10:00:00.000Z',
      closedAt: '2026-11-12T10:00:00.000Z',
    });
    const entries = buildTimeline(t, [
      msg(1),
      change(3, 'waiting_company', 'resolved', '2026-11-11T10:00:00.000Z'),
      change(2, 'new', 'open', '2026-11-10T10:30:00.000Z'),
    ]);
    expect(entries.map((e) => e.text)).toEqual([
      'Lo abrió la empresa',
      'Nuevo → En curso',
      'Primera respuesta',
      'Esperando a la empresa → Resuelto',
      'Cerrado',
    ]);
  });

  it('sin los mensajes de sistema, la resolución y el cierre salen de las fechas', () => {
    const t = ticket({ resolvedAt: '2026-11-15T10:00:00.000Z', openedBy: 'platform' });
    expect(buildTimeline(t, []).map((e) => e.text)).toEqual(['Lo abrió el soporte', 'Resuelto']);
  });
});
