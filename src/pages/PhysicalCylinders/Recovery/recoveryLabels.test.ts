import { describe, expect, it } from 'vitest';
import type { RecoveryCase } from '../../../services/api/types';
import {
  DECISIONS,
  RECOVERY_RISK_BAND,
  isPendingDecision,
  nextStepText,
  opportunisticText,
  recoveryStepText,
  riskText,
} from './recoveryLabels';

const CASE = {
  caseId: 'c-1',
  status: 'open',
  step: 1,
  depositAmount: 70000,
  stepDueAt: '2026-11-07T15:00:00.000Z',
  closedAt: null,
  pickup: null,
} as unknown as RecoveryCase;

describe('recoveryLabels', () => {
  it('sólo los escalados y los perdidos esperan al administrador', () => {
    expect(isPendingDecision('escalated')).toBe(true);
    expect(isPendingDecision('lost')).toBe(true);
    expect(isPendingDecision('open')).toBe(false);
    expect(isPendingDecision('returned')).toBe(false);
  });

  it('nombra los escalones', () => {
    expect(recoveryStepText(1)).toBe('Recordatorio');
    expect(recoveryStepText(2)).toBe('Aviso del depósito');
    expect(recoveryStepText(3)).toBe('Agotado');
    expect(recoveryStepText(9)).toBe('Escalón 9');
  });

  it('ofrece las tres decisiones y aclara que el sistema no cobra', () => {
    expect(DECISIONS.map((d) => d.value)).toEqual(['charge_deposit', 'write_off', 'close_no_charge']);
    expect(DECISIONS[0].help).toMatch(/no cobra/);
  });

  describe('nextStepText', () => {
    it('en aviso dice cuándo pasa al próximo escalón', () => {
      expect(nextStepText(CASE)).toMatch(/Pasa al próximo escalón/);
    });

    it('con el retiro aceptado dice que espera al chofer', () => {
      const withPickup = { ...CASE, pickup: { status: 'accepted' } } as unknown as RecoveryCase;
      expect(nextStepText(withPickup)).toBe('Espera el retiro del chofer en la entrega');
    });

    it('con una oferta que aprovecha la hoja dice el número de la hoja y en qué está', () => {
      const pickup = (status: string) =>
        ({ ...CASE, pickup: { status, opportunistic: true, routeSheetNumber: 12 } }) as unknown as RecoveryCase;
      expect(nextStepText(pickup('pending'))).toBe('Retiro aprovechando la hoja #12: esperando respuesta');
      expect(nextStepText(pickup('accepted'))).toBe('Retiro aprovechando la hoja #12: espera al chofer');
      expect(nextStepText(pickup('rejected'))).toMatch(/Pasa al próximo escalón/);
    });

    it('esperando decisión muestra el importe en juego', () => {
      expect(nextStepText({ ...CASE, status: 'escalated' })).toMatch(/70\.000/);
    });

    it('cerrado dice cuándo', () => {
      expect(nextStepText({ ...CASE, status: 'returned', closedAt: '2026-11-01T12:00:00.000Z' })).toMatch(
        /Devuelto el/,
      );
      expect(nextStepText({ ...CASE, status: 'written_off', closedAt: '2026-11-01T12:00:00.000Z' })).toMatch(
        /Cerrado el/,
      );
    });
  });

  it('«Retiro aprovechando la hoja #N» con y sin número', () => {
    expect(opportunisticText(7)).toBe('Retiro aprovechando la hoja #7');
    expect(opportunisticText(null)).toBe('Retiro aprovechando la hoja de ruta');
  });

  it('el riesgo del cliente en castellano, con el puntaje o sin historia', () => {
    expect(RECOVERY_RISK_BAND.high.text).toBe('Riesgo alto');
    expect(riskText({ band: 'high', score: 0.344, neutral: false })).toBe('Riesgo alto (puntaje 0,34)');
    expect(riskText({ band: 'medium', score: 0.15, neutral: true })).toBe('Riesgo medio: sin historia todavía');
  });
});
