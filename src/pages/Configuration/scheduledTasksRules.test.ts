import { describe, expect, it } from 'vitest';
import {
  TASKS,
  bestUnit,
  draftFromSeconds,
  formatInterval,
  toSeconds,
  fleetAlertHourSchema,
  intervalsSchema,
  toFleetAlertHourBody,
  toFleetAlertHourValues,
  toIntervalsBody,
  toIntervalsValues,
  validateFleetAlertHour,
  validateInterval,
} from './scheduledTasksRules';

describe('formatInterval', () => {
  it.each([
    [15, '15 segundos'],
    [1, '1 segundo'],
    [300, '5 minutos'],
    [60, '1 minuto'],
    [3600, '1 hora'],
    [7200, '2 horas'],
    [5400, '1 h 30 min'],
    [86400, '24 horas'],
  ])('%i s se muestra como %s', (seconds, text) => {
    expect(formatInterval(seconds)).toBe(text);
  });
});

describe('unidades', () => {
  it('elige la unidad más grande que da un entero', () => {
    expect(bestUnit(15)).toBe('seconds');
    expect(bestUnit(300)).toBe('minutes');
    expect(bestUnit(3600)).toBe('hours');
    expect(bestUnit(5400)).toBe('minutes');
  });

  it('ida y vuelta entre segundos y borrador', () => {
    expect(draftFromSeconds(1800)).toEqual({ amount: '30', unit: 'minutes' });
    expect(draftFromSeconds(7200)).toEqual({ amount: '2', unit: 'hours' });
    expect(toSeconds({ amount: '30', unit: 'minutes' })).toBe(1800);
    expect(Number.isNaN(toSeconds({ amount: '', unit: 'hours' }))).toBe(true);
  });
});

describe('validateInterval', () => {
  it('acepta múltiplos del tic hasta 24 h', () => {
    expect(validateInterval(15, 15)).toBeUndefined();
    expect(validateInterval(600, 300)).toBeUndefined();
    expect(validateInterval(86400, 3600)).toBeUndefined();
  });

  it('rechaza lo que no es múltiplo del tic, con el tic en el mensaje', () => {
    expect(validateInterval(400, 300)).toBe('Tiene que ser múltiplo de 5 minutos');
    expect(validateInterval(20, 15)).toBe('Tiene que ser múltiplo de 15 segundos');
    expect(validateInterval(5400, 3600)).toBe('Tiene que ser múltiplo de 1 hora');
  });

  it('respeta un tope menor a 24 h', () => {
    expect(validateInterval(300, 15, 300)).toBeUndefined();
    expect(validateInterval(315, 15, 300)).toBe('No puede superar 5 minutos');
  });

  it('rechaza cero, negativos, decimales, vacío y más de 24 h', () => {
    expect(validateInterval(0, 15)).toMatch(/mayor que cero/);
    expect(validateInterval(-15, 15)).toMatch(/mayor que cero/);
    expect(validateInterval(Number.NaN, 15)).toMatch(/mayor que cero/);
    expect(validateInterval(22.5, 15)).toMatch(/entero/);
    expect(validateInterval(86400 + 3600, 3600)).toMatch(/24 horas/);
  });
});

describe('validateFleetAlertHour', () => {
  it('de 0 a 23', () => {
    expect(validateFleetAlertHour(0)).toBeUndefined();
    expect(validateFleetAlertHour(23)).toBeUndefined();
    expect(validateFleetAlertHour(24)).toMatch(/0 y 23/);
    expect(validateFleetAlertHour(-1)).toMatch(/0 y 23/);
    expect(validateFleetAlertHour(7.5)).toMatch(/0 y 23/);
    expect(validateFleetAlertHour(Number.NaN)).toMatch(/0 y 23/);
  });
});

describe('intervalsSchema (plataforma)', () => {
  const defaults = {
    dispatchRetrySeconds: 15,
    reservationActivationSeconds: 300,
    unpaidReservationExpirySeconds: 3600,
    unpaidMercadoPagoExpirySeconds: 1800,
  };

  it('los reintentos del despacho topean en 300 s', () => {
    expect(TASKS.find((task) => task.field === 'dispatchRetrySeconds')?.maxSeconds).toBe(300);
    const values = toIntervalsValues({ ...defaults, dispatchRetrySeconds: 600 });
    const result = intervalsSchema.safeParse(values);
    const issue = result.success ? undefined : result.error.issues[0];
    expect(issue?.path.join('.')).toBe('intervals.dispatchRetrySeconds.amount');
    expect(issue?.message).toBe('No puede superar 5 minutos');
  });

  it('otra tarea sigue pudiendo llegar a 24 h', () => {
    const values = toIntervalsValues({ ...defaults, unpaidReservationExpirySeconds: 86400 });
    expect(intervalsSchema.safeParse(values).success).toBe(true);
  });

  it('ida y vuelta: el cuerpo lleva las cuatro frecuencias y nunca la hora', () => {
    const body = toIntervalsBody(toIntervalsValues(defaults));
    expect(body).toEqual(defaults);
    expect(body).not.toHaveProperty('fleetAlertHour');
  });
});

describe('fleetAlertHourSchema (empresa)', () => {
  it('ida y vuelta: el cuerpo lleva sólo la hora', () => {
    const values = toFleetAlertHourValues({ fleetAlertHour: 8 });
    expect(values).toEqual({ hour: '8' });
    expect(toFleetAlertHourBody(values)).toEqual({ fleetAlertHour: 8 });
  });

  it('la hora inválida o vacía va a su campo', () => {
    for (const hour of ['24', '', '7.5']) {
      const bad = fleetAlertHourSchema.safeParse({ hour });
      expect(bad.success ? '' : bad.error.issues[0]?.path.join('.')).toBe('hour');
    }
  });
});
