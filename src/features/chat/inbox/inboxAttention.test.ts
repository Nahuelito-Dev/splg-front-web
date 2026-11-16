import { describe, expect, it } from 'vitest';
import { inboxAttention, inboxAttentionLabel } from './inboxAttention';

const summary = (unassigned: number, awaitingHuman: number, unread: number, mine = 0) => ({
  unassigned,
  mine,
  awaitingHuman,
  unread,
});

describe('inboxAttention: la insignia de «Mensajes»', () => {
  it('es el mayor de sin asignar, esperando y sin leer: nunca suma dos veces la misma conversación', () => {
    // 3 sin asignar, 2 de ellas esperando y con algo sin leer: son 3 conversaciones, no 7.
    expect(inboxAttention(summary(3, 2, 2))).toBe(3);
    expect(inboxAttention(summary(1, 0, 4))).toBe(4);
    expect(inboxAttention(summary(0, 2, 0))).toBe(2);
  });

  it('las mías (sin nada sin leer) no piden atención', () => {
    expect(inboxAttention(summary(0, 0, 0, 5))).toBe(0);
  });

  it('el nombre accesible da el detalle y calla lo que es cero', () => {
    expect(inboxAttentionLabel(summary(3, 1, 2))).toBe(
      'Mensajes: 3 sin asignar, 1 esperando a alguien del equipo, 2 con mensajes sin leer',
    );
    expect(inboxAttentionLabel(summary(0, 0, 2))).toBe('Mensajes: 2 con mensajes sin leer');
    expect(inboxAttentionLabel(summary(0, 0, 0))).toBe('Mensajes: nada pendiente');
  });
});
