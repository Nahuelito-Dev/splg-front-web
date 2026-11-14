import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDay,
  formatLongDay,
  formatTime,
  formatElapsed,
  formatNumber,
  formatShortId,
  scheduledDayOf,
  formatArgentinaDay,
} from './format';

describe('format', () => {
  it('moneda en pesos, sin decimales', () => {
    expect(formatCurrency(22600).replace(/\s/g, ' ')).toBe('$ 22.600');
    expect(formatCurrency('48900')).toContain('48.900');
  });

  it('valores ausentes o inválidos se muestran como guion', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency('')).toBe('—');
    expect(formatCurrency('abc')).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatDate('no es fecha')).toBe('—');
  });

  it('una fecha sin hora no se corre un día por la zona horaria', () => {
    expect(formatDay('2026-09-26')).toMatch(/26/);
    expect(formatDay(null)).toBe('—');
  });

  it('un date-time ISO completo (medianoche UTC) no se corre un día: sólo importa el día de calendario', () => {
    // Un dueAt "2026-09-26" vuelve de la API como "2026-09-26T00:00:00.000Z"; en una
    // zona horaria negativa (Argentina, UTC-3) pasarlo por Date lo corría al 25.
    expect(formatDay('2026-09-26T00:00:00.000Z')).toMatch(/26/);
    expect(formatDay('2026-09-26T00:00:00.000Z')).not.toMatch(/25/);
  });
});

describe('fechas de calendario (YYYY-MM-DD)', () => {
  // La suite corre en hora argentina (`npm test`) y en UTC (`npm run test:utc`): el día es el mismo en las dos.
  it('formatDay y formatDate muestran el mismo día, sin pasar por la zona', () => {
    expect(formatDay('2026-11-02')).toBe('2 nov 2026');
    expect(formatDate('2026-11-02')).toBe('2 nov 2026');
    expect(formatDate('2026-11-02')).not.toMatch(/\b1 nov/);
  });

  it('un YYYY-MM-DD imposible no desborda al mes siguiente: «—»', () => {
    expect(formatDate('2026-02-30')).toBe('—');
    expect(formatDate('2026-13-01')).toBe('—');
  });

  it('un instante con hora se muestra en hora de Buenos Aires, no en la del navegador', () => {
    // Corre igual en hora argentina y en UTC (`npm run test:utc`): el resultado no depende de la zona del runner.
    expect(formatDate('2026-11-02T01:00:00.000Z')).toBe('1 nov 2026');
    expect(formatDateTime('2026-11-02T01:00:00.000Z')).toBe('1 nov 2026, 10:00 p. m.');
    expect(formatTime('2026-11-14T18:45:00.000Z')).toBe('03:45 p. m.');
    expect(formatLongDay(new Date('2026-11-15T01:00:00.000Z'))).toBe('Sábado, 14 de noviembre');
  });
});

describe('formatShortId y formatElapsed', () => {
  it('el id del pedido son los últimos 6 en mayúscula', () => {
    expect(formatShortId('c59bc7cd-932f-413a-b7f7-794d51cbc4e7')).toBe('#CBC4E7');
  });

  it('el tiempo transcurrido', () => {
    const now = Date.parse('2026-09-26T20:00:00Z');
    expect(formatElapsed('2026-09-26T19:59:58Z', now)).toBe('hace instantes');
    expect(formatElapsed('2026-09-26T19:59:30Z', now)).toBe('hace 30s');
    expect(formatElapsed('2026-09-26T19:55:00Z', now)).toBe('hace 5m');
    expect(formatElapsed('2026-09-26T17:00:00Z', now)).toBe('hace 3h');
    expect(formatElapsed('no es fecha', now)).toBe('hace instantes');
  });
});

describe('scheduledDayOf', () => {
  it('con hora se cuenta en Buenos Aires', () => {
    expect(scheduledDayOf('2026-11-11T01:00:00.000Z')).toBe('2026-11-10');
  });

  it('a medianoche UTC exacta es el día de calendario', () => {
    expect(scheduledDayOf('2026-11-11T00:00:00.000Z')).toBe('2026-11-11');
  });
});

describe('formatArgentinaDay (vigencias de zonas)', () => {
  it('desde 00:00 ART y hasta 23:59:59.999 ART del 2/11 se ven como el 2 nov', () => {
    expect(formatArgentinaDay('2026-11-02T03:00:00.000Z')).toBe('2 nov 2026');
    expect(formatArgentinaDay('2026-11-03T02:59:59.999Z')).toBe('2 nov 2026');
  });

  it('sin valor, guion', () => {
    expect(formatArgentinaDay(null)).toBe('—');
  });
});

describe('formatDay con un día que no existe', () => {
  it('2026-02-30 y 2026-13-01 dan «—», no otra fecha', () => {
    expect(formatDay('2026-02-30')).toBe('—');
    expect(formatDay('2026-13-01')).toBe('—');
    expect(formatDay('2026-02-30T00:00:00.000Z')).toBe('—');
  });

  it('un 29 de febrero bisiesto sí existe', () => {
    expect(formatDay('2028-02-29')).toBe('29 feb 2028');
  });
});
