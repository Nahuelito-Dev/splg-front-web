import { describe, expect, it } from 'vitest';
import type { Order } from '../../../services/api/types';
import {
  canAssignDriver,
  canCancel,
  canConfirmDelivery,
  canNotifyArrival,
  canViewDeliveryCode,
  isClosed,
  manualStatusActionLabel,
  manualStatusTargets,
} from './orderStatus';

describe('isClosed', () => {
  it('un pedido entregado ya terminó su recorrido', () => {
    expect(isClosed('delivered')).toBe(true);
  });

  it('un pedido cancelado ya terminó su recorrido', () => {
    expect(isClosed('cancelled')).toBe(true);
  });

  it.each<Order['status']>(['reserved', 'pending', 'accepted', 'out_for_delivery'])(
    'un pedido en estado %s todavía se puede asignar o cancelar',
    (status) => {
      expect(isClosed(status)).toBe(false);
    },
  );
});

describe('canCancel', () => {
  it.each<Order['status']>(['reserved', 'pending', 'accepted', 'out_for_delivery'])(
    'se puede cancelar un pedido %s',
    (status) => {
      expect(canCancel(status)).toBe(true);
    },
  );

  it.each<Order['status']>(['delivered', 'cancelled'])('no se puede cancelar un pedido %s', (status) => {
    expect(canCancel(status)).toBe(false);
  });
});

describe('canAssignDriver', () => {
  it('se puede asignar desde pendiente (pasa a aceptado)', () => {
    expect(canAssignDriver('pending')).toBe(true);
  });

  it('se puede reasignar desde aceptado', () => {
    expect(canAssignDriver('accepted')).toBe(true);
  });

  it.each<Order['status']>(['reserved', 'out_for_delivery', 'delivered', 'cancelled'])(
    'no se puede asignar en %s: la transición a ACCEPTED no es válida ahí',
    (status) => {
      expect(canAssignDriver(status)).toBe(false);
    },
  );
});

describe('manualStatusTargets', () => {
  it('nunca ofrece "accepted": esa transición la resuelve Asignar chofer', () => {
    for (const status of ['reserved', 'pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled'] as const) {
      expect(manualStatusTargets(status)).not.toContain('accepted');
    }
  });

  it('nunca ofrece "cancelled": ese PATCH no restituye stock, a diferencia de PATCH /cancel', () => {
    for (const status of ['reserved', 'pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled'] as const) {
      expect(manualStatusTargets(status)).not.toContain('cancelled');
    }
  });

  it('reservado sólo puede activarse a pendiente', () => {
    expect(manualStatusTargets('reserved')).toEqual(['pending']);
  });

  it('pendiente no tiene transición manual (sólo Asignar chofer o Cancelar)', () => {
    expect(manualStatusTargets('pending')).toEqual([]);
  });

  it('aceptado puede avanzar a en camino o liberarse a pendiente', () => {
    expect(manualStatusTargets('accepted')).toEqual(['out_for_delivery', 'pending']);
  });

  it('en camino puede marcarse entregado o liberarse a pendiente', () => {
    expect(manualStatusTargets('out_for_delivery')).toEqual(['delivered', 'pending']);
  });

  it.each<Order['status']>(['delivered', 'cancelled'])('%s es terminal: sin transiciones manuales', (status) => {
    expect(manualStatusTargets(status)).toEqual([]);
  });
});

describe('manualStatusActionLabel', () => {
  it('activar una reserva (reserved → pending) no es lo mismo que liberar un pedido despachado', () => {
    expect(manualStatusActionLabel('reserved', 'pending')).toBe('Activar reserva');
  });

  it('liberar a pendiente desde aceptado o en camino usa el texto genérico', () => {
    expect(manualStatusActionLabel('accepted', 'pending')).toBe('Volver a pendiente');
    expect(manualStatusActionLabel('out_for_delivery', 'pending')).toBe('Volver a pendiente');
  });

  it('el resto de las etiquetas describen el destino', () => {
    expect(manualStatusActionLabel('accepted', 'out_for_delivery')).toBe('Marcar en camino');
    expect(manualStatusActionLabel('out_for_delivery', 'delivered')).toBe('Marcar como entregado');
  });
});

describe('soporte de entrega', () => {
  it('el código de entrega sólo se puede ver aceptado o en camino', () => {
    expect(canViewDeliveryCode('accepted')).toBe(true);
    expect(canViewDeliveryCode('out_for_delivery')).toBe(true);
    expect(canViewDeliveryCode('pending')).toBe(false);
    expect(canViewDeliveryCode('delivered')).toBe(false);
  });

  it('confirmar entrega y avisar llegada sólo con el pedido en camino', () => {
    expect(canConfirmDelivery('out_for_delivery')).toBe(true);
    expect(canConfirmDelivery('accepted')).toBe(false);
    expect(canNotifyArrival('out_for_delivery')).toBe(true);
    expect(canNotifyArrival('delivered')).toBe(false);
  });
});
