import { describe, expect, it } from 'vitest';
import type { PendingItem, PurchaseOrder, PurchaseOrderItem } from '../../services/api/types';
import { orderActions, receiptRowsFromPending } from './purchaseRules';

const names = (status: PurchaseOrder['status']) =>
  Object.entries(orderActions(status))
    .filter(([, v]) => v)
    .map(([k]) => k);

describe('orderActions', () => {
  it('borrador: edita, envía y cancela', () => expect(names('draft')).toEqual(['canEdit', 'canSend', 'canCancel']));
  it('enviada: cancela o recibe, no edita', () => expect(names('sent')).toEqual(['canCancel', 'canReceive']));
  it('parcial: cierra con faltante y recibe; cancelar se ofrece para mostrar el 409', () =>
    expect(names('partially_received')).toEqual(['canCancel', 'canCloseShort', 'canReceive']));
  it('recibida: sólo cancelar (el 409 explica qué hacer)', () => expect(names('received')).toEqual(['canCancel']));
  it.each(['closed_short', 'cancelled'] as const)('%s: nada', (s) => expect(names(s)).toEqual([]));
});

describe('receiptRowsFromPending', () => {
  const pending = [
    { gasCylinderId: 'a', gasCylinderType: '10kg', ordered: 20, received: 8, pending: 12, emptiesToExchange: 20 },
    { gasCylinderId: 'b', gasCylinderType: '5kg', ordered: 5, received: 5, pending: 0, emptiesToExchange: 5 },
  ] as PendingItem[];
  const items = [{ gasCylinderId: 'a', unitCost: 5000 }] as PurchaseOrderItem[];
  it('sólo lo pendiente, al costo de la orden, con vacías por canjear sin pasar de lo recibido', () => {
    expect(receiptRowsFromPending(pending, items)).toEqual([
      { gasCylinderId: 'a', type: '10kg', pending: 12, quantityFull: 12, quantityEmptyOut: 12, unitCost: 5000 },
    ]);
  });
});
