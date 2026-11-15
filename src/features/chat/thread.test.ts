import { describe, expect, it } from 'vitest';
import { msg } from '../../test/chatFixtures';
import { decideIncoming, dropConfirmed, lastIncomingSeq, mergeMessages, type PendingMessage } from './thread';

const pending = (clientMessageId: string): PendingMessage => ({
  clientMessageId,
  body: 'hola',
  status: 'sending',
  createdAt: '2026-11-14T15:00:00.000Z',
});

describe('reconciliación por seq (P2)', () => {
  it('junta sin duplicar y ordena por número, nunca por hora', () => {
    const viejo = msg(2, { createdAt: '2026-11-14T18:00:00.000Z' });
    const merged = mergeMessages([msg(1), viejo, msg(3)], [msg(3), msg(2, { body: 'versión nueva' }), msg(4)]);
    expect(merged.map((m) => m.seq)).toEqual([1, 2, 3, 4]);
    expect(merged.find((m) => m.seq === 2)?.body).toBe('versión nueva');
  });

  it('el siguiente se agrega, uno repetido se ignora y un hueco pide ponerse al día', () => {
    const thread = { messages: [msg(1), msg(2)] };
    expect(decideIncoming(thread, 3)).toBe('append');
    expect(decideIncoming(thread, 2)).toBe('ignore');
    expect(decideIncoming(thread, 5)).toBe('catch-up');
    expect(decideIncoming({ messages: [] }, 1)).toBe('append');
    expect(decideIncoming({ messages: [] }, 7)).toBe('catch-up');
  });

  it('un pendiente sale cuando la API devuelve su clientMessageId', () => {
    const left = dropConfirmed([pending('a'), pending('b')], [msg(5, { clientMessageId: 'a', isMine: true })]);
    expect(left.map((p) => p.clientMessageId)).toEqual(['b']);
  });

  it('lo último de la otra punta es lo que se marca leído', () => {
    expect(lastIncomingSeq([msg(1), msg(2, { isMine: true })])).toBe(1);
    expect(lastIncomingSeq([])).toBe(0);
  });
});
