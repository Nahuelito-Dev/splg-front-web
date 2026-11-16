import { describe, expect, it } from 'vitest';
import {
  conversionText,
  customerHref,
  daysLeftText,
  INVITATION_STATUS,
  runSummary,
  SKIP_REASON,
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
});
