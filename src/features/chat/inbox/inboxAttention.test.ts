import { describe, expect, it } from 'vitest';
import type { InboxSummary } from '../../../services/api/types';
import { inboxAttention, inboxAttentionLabel } from './inboxAttention';

const summary = (over: Partial<InboxSummary> = {}): InboxSummary => ({
  unassigned: 0,
  mine: 0,
  awaitingHuman: 0,
  unread: 0,
  attention: 0,
  mentions: 0,
  ...over,
});

describe('inboxAttention: la insignia de «Mensajes»', () => {
  it('es `attention` de la API (cada conversación una vez), no la suma ni el mayor de los otros números', () => {
    // 2 sin asignar y 3 sin leer que son otras: 5 conversaciones (el mayor daría 3, la suma de todo 7).
    expect(inboxAttention(summary({ unassigned: 2, unread: 3, awaitingHuman: 2, attention: 5 }))).toBe(5);
    expect(inboxAttention(summary({ unassigned: 3, unread: 3, attention: 3 }))).toBe(3);
  });

  it('las mías sin nada pendiente no piden atención', () => {
    expect(inboxAttention(summary({ mine: 5 }))).toBe(0);
  });

  it('sin otra cosa pendiente, las menciones sin leer encienden la insignia', () => {
    expect(inboxAttention(summary({ mentions: 2 }))).toBe(2);
    expect(inboxAttention(summary({ attention: 1, mentions: 4 }))).toBe(1);
  });

  it('el nombre accesible da el detalle (también las menciones) y calla lo que es cero', () => {
    expect(inboxAttentionLabel(summary({ unassigned: 3, awaitingHuman: 1, unread: 2, attention: 4 }))).toBe(
      'Mensajes: 3 sin asignar, 1 esperando a alguien del equipo, 2 con mensajes sin leer',
    );
    expect(inboxAttentionLabel(summary({ unread: 2, attention: 2, mentions: 1 }))).toBe(
      'Mensajes: 2 con mensajes sin leer, 1 mención sin leer',
    );
    expect(inboxAttentionLabel(summary({ mentions: 3 }))).toBe('Mensajes: 3 menciones sin leer');
    expect(inboxAttentionLabel(summary())).toBe('Mensajes: nada pendiente');
  });
});
