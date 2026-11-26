import { describe, expect, it } from 'vitest';
import {
  conversionText,
  customerHref,
  daysLeftText,
  INVITATION_STATUS,
  noticeScheduleText,
  offsetText,
  runSummary,
  SKIP_REASON,
  whenText,
} from './repurchaseLabels';

describe('repurchaseLabels', () => {
  it('los días que faltan se dicen en castellano, con el pasado en pasado', () => {
    expect(daysLeftText(0.2)).toBe('Hoy');
    expect(daysLeftText(-0.4)).toBe('Hoy');
    expect(daysLeftText(1.2)).toBe('En 1 día');
    expect(daysLeftText(2.6)).toBe('En 3 días');
    expect(daysLeftText(-1)).toBe('Hace 1 día');
    expect(daysLeftText(-4.8)).toBe('Hace 5 días');
  });

  it('la conversión es un porcentaje y sin resueltas no hay tasa', () => {
    expect(conversionText(0.3333)).toBe('33 %');
    expect(conversionText(1)).toBe('100 %');
    expect(conversionText(0)).toBe('0 %');
    expect(conversionText(null)).toBe('—');
  });

  it('la ficha del cliente se abre por su perfil, no por su cuenta', () => {
    const base = { userId: 'u-1', fullName: null, email: null, phoneNumber: null };
    expect(customerHref({ ...base, customerId: 'c-1' })).toBe('/customers/details/c-1?tab=repurchase');
    expect(customerHref({ ...base, customerId: null })).toBeNull();
  });

  it('cada estado de invitación tiene su etiqueta', () => {
    expect(Object.keys(INVITATION_STATUS).sort()).toEqual(['accepted', 'cancelled', 'expired', 'pending', 'rejected']);
    expect(INVITATION_STATUS.accepted.tone).toBe('success');
  });

  it('el resumen de la corrida cuenta lo invitado y explica lo omitido', () => {
    expect(runSummary({ invited: 2, expired: 1, skipped: { not_yet: 4, cooldown: 0, recent_order: 1, raro: 2 } })).toBe(
      `2 invitación(es) · 1 vencida(s) · sin invitar: 4 ${SKIP_REASON.not_yet.toLowerCase()}, 1 ${SKIP_REASON.recent_order.toLowerCase()}, 2 raro`,
    );
    expect(runSummary({ invited: 0, expired: 0, skipped: {} })).toBe('0 invitación(es)');
  });

  it('el ajuste se dice con signo y sólo si lo hay', () => {
    expect(offsetText(0)).toBeNull();
    expect(offsetText(3)).toBe('+3 días respecto del promedio');
    expect(offsetText(1)).toBe('+1 día respecto del promedio');
    expect(offsetText(-2)).toBe('−2 días respecto del promedio');
  });

  it('la hora del aviso se dice en hora de Buenos Aires: hoy, mañana o con fecha', () => {
    const now = new Date('2026-11-25T12:00:00Z');
    expect(whenText('2026-11-25T21:00:00.000Z', now)).toBe('hoy a las 18:00');
    expect(whenText('2026-11-26T12:05:00.000Z', now)).toBe('mañana a las 09:05');
    expect(whenText('2026-12-03T21:00:00.000Z', now)).toMatch(/^el .*2026 a las 18:00$/);
  });

  it('el aviso programado, el ya enviado y la ausencia de invitación', () => {
    const now = new Date('2026-11-25T12:00:00Z');
    const open = { invitationId: 'i-1', expiresAt: '2026-11-26T12:00:00.000Z' };
    expect(noticeScheduleText({ openInvitation: null, notifyAt: null, notifiedAt: null }, now)).toBeNull();
    expect(
      noticeScheduleText({ openInvitation: open, notifyAt: '2026-11-25T21:00:00.000Z', notifiedAt: null }, now),
    ).toBe('Se avisa hoy a las 18:00');
    expect(
      noticeScheduleText(
        { openInvitation: open, notifyAt: '2026-11-25T12:00:00.000Z', notifiedAt: '2026-11-25T12:05:00.000Z' },
        now,
      ),
    ).toBe('Avisado hoy a las 09:05');
    expect(noticeScheduleText({ openInvitation: open, notifyAt: null, notifiedAt: null }, now)).toBeNull();
  });
});
