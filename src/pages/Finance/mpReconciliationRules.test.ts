import { describe, expect, it } from 'vitest';
import type { MpApply, MpReconciliationItem, MpSummary } from '../../services/api/types';
import {
  amountsLine,
  applySummary,
  countsOf,
  failureMessages,
  groupByKind,
  isSelectable,
  missingBoxes,
  netGap,
  newReconciliationSchema,
  selectableIds,
  toApplyBody,
} from './mpReconciliationRules';

const item = (over: Partial<MpReconciliationItem> = {}): MpReconciliationItem => ({
  itemId: 'i-1',
  kind: 'payment_not_in_cash',
  sourceId: 'MP-1',
  paymentId: null,
  orderId: null,
  occurredAt: '2026-10-02T13:00:00.000Z',
  mpDescription: 'payment',
  mpAmount: 1000,
  ledgerAmount: null,
  difference: null,
  extraAmount: 50,
  direction: 'in',
  appliable: true,
  needsCashBox: false,
  accountLevel: false,
  note: 'nota',
  status: 'pending',
  appliedAt: null,
  appliedMovementId: null,
  ...over,
});

describe('newReconciliationSchema', () => {
  const schema = newReconciliationSchema('2026-10-30');
  const check = (values: { from: string; to: string }) => schema.safeParse(values);

  it('acepta un rango real, de un día hasta 31', () => {
    expect(check({ from: '2026-10-01', to: '2026-10-01' }).success).toBe(true);
    expect(check({ from: '2026-09-30', to: '2026-10-30' }).success).toBe(true);
  });

  it('rechaza 32 días, un rango al revés y las fechas futuras, con el mensaje en el campo «Hasta»', () => {
    const largo = check({ from: '2026-09-29', to: '2026-10-30' });
    const alReves = check({ from: '2026-10-10', to: '2026-10-01' });
    const futuro = check({ from: '2026-10-01', to: '2026-10-31' });
    for (const r of [largo, alReves, futuro]) {
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].path).toEqual(['to']);
    }
    if (!largo.success) expect(largo.error.issues[0].message).toBe('El rango no puede pasar de 31 días');
    if (!alReves.success) expect(alReves.error.issues[0].message).toBe('No puede ser anterior al inicio');
    if (!futuro.success) expect(futuro.error.issues[0].message).toBe('No puede ser una fecha futura');
  });

  it('pide las dos fechas', () => {
    expect(check({ from: '', to: '' }).success).toBe(false);
  });
});

describe('diferencias', () => {
  const items = [
    item({ itemId: 'a', kind: 'tax_withholding' }),
    item({ itemId: 'b', kind: 'payment_not_in_cash' }),
    item({ itemId: 'c', kind: 'payment_not_in_cash', status: 'applied' }),
    item({ itemId: 'd', kind: 'amount_mismatch', appliable: false }),
    item({ itemId: 'e', kind: 'payout', needsCashBox: true, accountLevel: true }),
  ];

  it('agrupa por tipo en el orden en que se explican y salta los grupos vacíos', () => {
    expect(groupByKind(items).map((g) => [g.kind, g.items.length])).toEqual([
      ['payment_not_in_cash', 2],
      ['tax_withholding', 1],
      ['payout', 1],
      ['amount_mismatch', 1],
    ]);
  });

  it('sólo se marcan las asentables que siguen sin asentar', () => {
    expect(items.filter(isSelectable).map((i) => i.itemId)).toEqual(['a', 'b', 'e']);
    expect(selectableIds(items)).toEqual(['a', 'b', 'e']);
    expect(countsOf(items)).toEqual({ pending: 3, applied: 1 });
  });

  it('detecta los retiros marcados sin caja de destino', () => {
    const selected = new Set(['a', 'e']);
    expect(missingBoxes(items, selected, {}).map((i) => i.itemId)).toEqual(['e']);
    expect(missingBoxes(items, selected, { e: 'b-1' })).toEqual([]);
    expect(missingBoxes(items, new Set(['a']), {})).toEqual([]);
  });

  it('arma el cuerpo con la caja sólo en los retiros y sin lo que no se puede asentar', () => {
    const selected = new Set(['a', 'c', 'd', 'e']);
    expect(toApplyBody(items, selected, { e: 'b-1' }, 'dist-1')).toEqual({
      items: [{ itemId: 'a' }, { itemId: 'e', cashBoxId: 'b-1' }],
      distributorId: 'dist-1',
    });
  });

  it('la distribuidora va explícita sólo si se asienta algo de la cuenta', () => {
    expect(toApplyBody(items, new Set(['a']), {}, 'dist-1')).toEqual({ items: [{ itemId: 'a' }] });
  });

  it('cuenta lo que cada diferencia trae', () => {
    expect(amountsLine(item({ ledgerAmount: 900, difference: 100 })).replace(/\u00a0/g, ' ')).toBe(
      'Mercado Pago $ 1.000,00 · Caja $ 900,00 · Diferencia $ 100,00 · Comisión $ 50,00',
    );
    expect(amountsLine(item({ mpAmount: null, extraAmount: null }))).toBe('');
  });
});

describe('resultado de aplicar', () => {
  const result = (over: Partial<MpApply> = {}): MpApply => ({
    applied: 2,
    alreadyApplied: 1,
    failed: 1,
    results: [
      { itemId: 'a', outcome: 'applied', message: null, movementId: 'm-1' },
      { itemId: 'b', outcome: 'failed', message: 'La caja está desactivada', movementId: null },
      { itemId: 'c', outcome: 'failed', message: null, movementId: null },
    ],
    ...over,
  });

  it('dice lo asentado y lo que no, y sólo es completo si nada falló', () => {
    expect(applySummary(result())).toEqual({
      text: '2 ajustes asentados; 1 ya estaba asentado; 1 no se pudo asentar',
      complete: false,
    });
    expect(applySummary(result({ applied: 1, alreadyApplied: 0, failed: 0 }))).toEqual({
      text: '1 ajuste asentado',
      complete: true,
    });
  });

  it('da el motivo de cada falla', () => {
    expect(failureMessages(result())).toEqual({ b: 'La caja está desactivada', c: 'No se pudo asentar' });
  });
});

describe('netGap', () => {
  it('es lo que Mercado Pago informa de neto menos lo que tiene la caja', () => {
    const summary = { mp: { net: 40300 }, cash: { net: 40000.1 } } as MpSummary;
    expect(netGap(summary)).toBe(299.9);
  });
});
