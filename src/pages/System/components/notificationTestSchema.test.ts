import { describe, expect, it } from 'vitest';
import { notificationTestSchema } from './notificationTestSchema';

const valid = { token: 'un-token-de-fcm', title: 'Prueba', body: 'Probando notificaciones' };

describe('notificationTestSchema', () => {
  it('acepta un envío válido', () => {
    expect(notificationTestSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['sin token', { token: '' }],
    ['sin título', { title: '' }],
    ['título de más de 100 caracteres', { title: 'a'.repeat(101) }],
    ['sin cuerpo', { body: '' }],
    ['cuerpo de más de 500 caracteres', { body: 'a'.repeat(501) }],
  ])('rechaza %s', (_, cambio) => {
    expect(notificationTestSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
