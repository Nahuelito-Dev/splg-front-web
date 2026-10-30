import { describe, expect, it } from 'vitest';
import type { ForecastItem } from '../../../services/api/types';
import { daysLeftText, forecastState, formatWindow, isOpenCase, projectionReason, usageText } from './plannerLabels';

const item = (over: Partial<ForecastItem> = {}): ForecastItem =>
  ({
    taskId: 't-1',
    taskName: 'Service',
    criticality: 'non_blocking',
    needsWorkshop: true,
    dueAt: null,
    dueKm: null,
    kmRemaining: null,
    predictedByKmAt: null,
    projectedDueAt: null,
    daysLeft: null,
    dueSoon: false,
    underObservation: false,
    scheduledAt: null,
    caseId: null,
    caseStatus: null,
    ...over,
  }) as ForecastItem;

describe('plannerLabels', () => {
  it('el consumo explica de dónde sale', () => {
    expect(
      usageText({ kmPerDay: 54.2, usageSource: 'own', historyDays: 72, usageStale: false, lastUsageDay: '2026-10-28' }),
    ).toContain('72 días con registro de uso');
    expect(
      usageText({ kmPerDay: 30, usageSource: 'fleet_average', historyDays: 0, usageStale: false, lastUsageDay: null }),
    ).toContain('promedio');
    expect(
      usageText({ kmPerDay: null, usageSource: null, historyDays: 0, usageStale: false, lastUsageDay: null }),
    ).toContain('observación');
  });

  it('datos de uso viejos se dicen como tal y no se proyectan', () => {
    const texto = usageText({
      kmPerDay: 17.1,
      usageSource: 'own',
      historyDays: 11,
      usageStale: true,
      lastUsageDay: '2026-10-11',
    });
    expect(texto).toContain('desactualizados');
    expect(texto).toContain('11 oct 2026');
    expect(texto).toContain('no se proyecta');
  });

  it('dice por qué se proyecta esa fecha', () => {
    expect(projectionReason(item({ dueKm: 11000, kmRemaining: 500, predictedByKmAt: '2026-11-10T00:00:00Z' }))).toBe(
      'Faltan 500 km para los 11.000 km',
    );
    expect(projectionReason(item({ dueKm: 11000, kmRemaining: -20 }))).toBe('Ya llegó a los 11.000 km');
    expect(projectionReason(item({ dueKm: 11000, kmRemaining: 500 }))).toContain('no hay consumo');
    expect(projectionReason(item({ dueAt: '2026-12-01T00:00:00Z' }))).toBe('Por su fecha de vencimiento');
    expect(projectionReason(item())).toBe('Sin fecha de vencimiento');
  });

  it('cuenta los días', () => {
    expect(daysLeftText(null)).toBe('Sin fecha proyectada');
    expect(daysLeftText(0)).toBe('Vence hoy');
    expect(daysLeftText(1)).toBe('Vence en 1 día');
    expect(daysLeftText(12)).toBe('Vence en 12 días');
    expect(daysLeftText(-3)).toBe('Venció hace 3 días');
  });

  it('el estado de una tarea sigue el orden: sin taller, observación, caso, programada, por vencer', () => {
    expect(forecastState(item({ needsWorkshop: false })).text).toBe('Sin taller');
    expect(forecastState(item({ underObservation: true })).text).toBe('En observación');
    expect(forecastState(item({ caseStatus: 'escalated', scheduledAt: '2099-11-01T00:00:00Z' })).text).toBe('Escalado');
    expect(forecastState(item({ scheduledAt: '2099-11-01T00:00:00Z' })).text).toBe('Programada');
    expect(forecastState(item({ scheduledAt: '2020-11-01T00:00:00Z' })).text).toBe('En regla');
    expect(forecastState(item({ dueSoon: true })).text).toBe('Por vencer');
    expect(forecastState(item()).text).toBe('En regla');
  });

  it('una ventana se muestra con su hora de fin, o sola si no tiene', () => {
    expect(formatWindow('2026-11-02T11:00:00Z', '2026-11-02T16:00:00Z')).toBe('lun, 2 nov, 08:00 a 13:00');
    expect(formatWindow('2026-11-02T11:00:00Z', null)).toBe('lun, 2 nov, 08:00');
    expect(formatWindow(null, null)).toBe('—');
  });

  it('un caso está abierto hasta que se confirma o se cancela', () => {
    expect(['negotiating', 'awaiting_confirmation', 'escalated'].every((s) => isOpenCase(s as never))).toBe(true);
    expect(isOpenCase('confirmed')).toBe(false);
    expect(isOpenCase('cancelled')).toBe(false);
  });
});
