import { describe, expect, it } from 'vitest';
import type { CashCollectionSettings, PendingCollections, SettlePending } from '../../services/api/types';
import { formatCurrency } from '../../utils/format';
import { boxesOf, canSettle, pendingSentence, settleSummary, toSettingsBody } from './collectionSettingsRules';

const settings = (over: Partial<CashCollectionSettings> = {}): CashCollectionSettings => ({
  mercadoPagoCashBoxId: 'w-1',
  mercadoPagoCashBoxName: 'Mercado Pago',
  updatedAt: '2026-10-30T12:00:00.000Z',
  ...over,
});

const pending = (over: Partial<PendingCollections> = {}): PendingCollections => ({
  from: '2026-10-01T03:00:00.000Z',
  count: 2,
  amount: 30000.5,
  mercadoPago: { count: 2, amount: 30000.5 },
  refunds: { count: 0, amount: 0 },
  oldestAt: '2026-10-02T12:00:00.000Z',
  ...over,
});

describe('boxesOf / toSettingsBody', () => {
  it('sin caja guardada el formulario arranca vacío y el cuerpo manda null para quitarla', () => {
    expect(boxesOf(settings({ mercadoPagoCashBoxId: null }))).toEqual({ mercadoPago: '' });
    expect(toSettingsBody({ mercadoPago: '' })).toEqual({ mercadoPagoCashBoxId: null });
    expect(toSettingsBody({ mercadoPago: 'w-2' })).toEqual({ mercadoPagoCashBoxId: 'w-2' });
  });

  it('el cuerpo ya no lleva caja de transferencias', () => {
    expect(toSettingsBody({ mercadoPago: 'w-2' })).not.toHaveProperty('transferCashBoxId');
  });
});

describe('pendingSentence', () => {
  it('cuenta los cobros sin asentar desde la fecha, con el importe y el detalle', () => {
    expect(pendingSentence(pending(), '2026-10-01')).toBe(
      `Hay 2 movimientos de ventas sin asentar desde el 1 oct 2026 (${formatCurrency(30000.5)} netos): 2 de Mercado Pago.`,
    );
  });

  it('suma las devoluciones sin egreso', () => {
    expect(
      pendingSentence(
        pending({ count: 3, mercadoPago: { count: 1, amount: 0 }, refunds: { count: 2, amount: 600 } }),
        '2026-10-01',
      ),
    ).toContain('1 de Mercado Pago, 2 devoluciones sin su egreso');
  });

  it('sin pendientes lo dice', () => {
    expect(pendingSentence(pending({ count: 0, amount: 0, mercadoPago: { count: 0, amount: 0 } }), '2026-10-01')).toBe(
      'No hay cobros sin asentar desde el 1 oct 2026.',
    );
  });
});

describe('settleSummary', () => {
  const result = (over: Partial<SettlePending>): SettlePending => ({
    settled: 0,
    alreadySettled: 0,
    withoutCashBox: 0,
    failed: 0,
    refundsSettled: 0,
    feesSettled: 0,
    ...over,
  });

  it('todo asentado es completo', () => {
    expect(settleSummary(result({ settled: 4 }))).toEqual({ text: '4 cobros asentados', complete: true });
    expect(settleSummary(result({ settled: 1 })).text).toBe('1 cobro asentado');
  });

  it('cuenta aparte las devoluciones y las comisiones asentadas', () => {
    const summary = settleSummary(result({ settled: 1, refundsSettled: 2, feesSettled: 1 }));
    expect(summary).toEqual({
      text: '1 cobro asentado; 2 devoluciones asentadas; 1 comisión asentada',
      complete: true,
    });
  });

  it('lo que quedó afuera se informa y el resultado no es completo', () => {
    const summary = settleSummary(result({ settled: 2, alreadySettled: 1, withoutCashBox: 1, failed: 2 }));
    expect(summary.complete).toBe(false);
    expect(summary.text).toContain('2 cobros asentados');
    expect(summary.text).toContain('1 ya estaban asentados');
    expect(summary.text).toContain('1 cobro sin caja configurada');
    expect(summary.text).toContain('2 cobros que la caja rechazó');
  });
});

describe('canSettle', () => {
  it('las devoluciones sin egreso se asientan sin elegir caja', () => {
    const sinCaja = settings({ mercadoPagoCashBoxId: null });
    const base = { mercadoPago: { count: 0, amount: 0 } };
    expect(canSettle(sinCaja, pending({ ...base, refunds: { count: 1, amount: 5 } }))).toBe(true);
    expect(canSettle(sinCaja, pending({ ...base }))).toBe(false);
  });

  it('hace falta la caja de Mercado Pago para sus cobros pendientes', () => {
    expect(canSettle(settings(), pending())).toBe(true);
    expect(canSettle(settings({ mercadoPagoCashBoxId: null }), pending())).toBe(false);
  });
});
