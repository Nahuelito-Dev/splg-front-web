import { describe, expect, it } from 'vitest';
import {
  automaticRepliesByLabel,
  automaticReplyLabel,
  csvPercent,
  formatMetricMinutes,
  formatPartOf,
  formatRate,
  formatScore,
  presetPeriod,
  readPeriod,
  templateTitle,
} from './metricsFormat';

describe('formato de las métricas', () => {
  it('minutos: guion sin dato, nunca NaN; redondea y pasa a horas', () => {
    expect(formatMetricMinutes(null)).toBe('—');
    expect(formatMetricMinutes(Number.NaN)).toBe('—');
    expect(formatMetricMinutes(0)).toBe('0 min');
    expect(formatMetricMinutes(0.4)).toBe('menos de 1 min');
    expect(formatMetricMinutes(12.5)).toBe('13 min');
    expect(formatMetricMinutes(95)).toBe('1 h 35 min');
    expect(formatMetricMinutes(120)).toBe('2 h');
  });

  it('proporciones de la API (0 a 1) como porcentaje con coma; sin dato, guion', () => {
    expect(formatRate(0.854)).toBe('85,4 %');
    expect(formatRate(1)).toBe('100 %');
    expect(formatRate(0)).toBe('0 %');
    expect(formatRate(null)).toBe('—');
    expect(formatRate(Number.NaN)).toBe('—');
  });

  it('promedio de la encuesta sobre 5', () => {
    expect(formatScore(4.5)).toBe('4,5 de 5');
    expect(formatScore(5)).toBe('5,0 de 5');
    expect(formatScore(null)).toBe('—');
  });

  it('«parte de total» y nombres de las respuestas automáticas', () => {
    expect(formatPartOf(35, 1041)).toBe('35 de 1.041');
    expect(automaticReplyLabel('fuera_de_horario')).toBe('Fuera de horario');
    expect(automaticReplyLabel('received_ack')).toBe('Aviso de recibido');
    expect(automaticReplyLabel('otra_clave')).toBe('Otra respuesta automática');
  });

  it('las automáticas se suman por nombre: el mismo aviso con dos claves va en una sola barra', () => {
    expect(
      automaticRepliesByLabel([
        { key: 'fuera_de_horario', count: 10 },
        { key: 'recibido', count: 8 },
        { key: 'received_ack', count: 5 },
        { key: 'una', count: 1 },
        { key: 'otra', count: 2 },
      ]),
    ).toEqual([
      { label: 'Aviso de recibido', count: 13 },
      { label: 'Fuera de horario', count: 10 },
      { label: 'Otra respuesta automática', count: 3 },
    ]);
  });

  it('respuesta guardada: su título; si ya no existe o no se pudieron leer, un nombre genérico, nunca la clave', () => {
    const templates = [{ key: 'saludo', title: 'Saludo' }];
    expect(templateTitle('saludo', templates)).toBe('Saludo');
    expect(templateTitle('vieja', templates)).toBe('Respuesta guardada que ya no existe');
    expect(templateTitle('saludo', null)).toBe('Respuesta guardada');
  });

  it('porcentaje para la planilla: ×100 con un decimal; sin dato, vacío', () => {
    expect(csvPercent(0.25)).toBe(25);
    expect(csvPercent(0.1667)).toBe(16.7);
    expect(csvPercent(null)).toBe('');
    expect(csvPercent(undefined)).toBe('');
  });
});

describe('período de las métricas', () => {
  const today = '2026-11-16';

  it('los atajos cuentan hoy: 7, 30 y 90 días', () => {
    expect(presetPeriod('7', today)).toEqual({ from: '2026-11-10', to: today });
    expect(presetPeriod('30', today)).toEqual({ from: '2026-10-18', to: today });
    expect(presetPeriod('90', today)).toEqual({ from: '2026-08-19', to: today });
  });

  it('sin fechas es el de la API por omisión: no se mandan', () => {
    expect(readPeriod('', '', today)).toEqual({ range: null, preset: '30', error: null });
  });

  it('una fecha que no es un día, o un solo extremo, es un error: no se cae en silencio al de omisión', () => {
    const error = 'Las fechas del período no son válidas: elegí otro período.';
    expect(readPeriod('2026-02-30', '2026-03-01', today)).toEqual({ range: null, preset: null, error });
    expect(readPeriod('hoy', '', today).error).toBe(error);
    expect(readPeriod('2026-11-01', '', today).error).toBe(error);
  });

  it('reconoce el atajo de un rango y deja personalizado el resto', () => {
    expect(readPeriod('2026-11-10', today, today).preset).toBe('7');
    expect(readPeriod('2026-08-19', today, today).preset).toBe('90');
    expect(readPeriod('2026-11-01', '2026-11-05', today)).toEqual({
      range: { from: '2026-11-01', to: '2026-11-05' },
      preset: null,
      error: null,
    });
  });

  it('las mismas reglas que la API: «desde» no posterior a «hasta» y hasta 366 días', () => {
    expect(readPeriod('2026-11-05', '2026-11-01', today).error).toBe(
      'La fecha «desde» no puede ser posterior a la fecha «hasta».',
    );
    expect(readPeriod('2025-11-16', '2026-11-16', today).error).toBeNull();
    expect(readPeriod('2025-11-15', '2026-11-16', today).error).toBe('El período puede abarcar hasta 366 días.');
  });
});
