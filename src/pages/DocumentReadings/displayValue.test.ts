import { describe, expect, it } from 'vitest';
import { formatCurrencyExact, formatDateTime, formatDay } from '../../utils/format';
import { displayValue } from './documentReadingRules';

describe('displayValue', () => {
  it('muestra un instante ISO como fecha y hora, no en crudo', () => {
    const v = '2026-11-05T18:40:00-03:00';
    expect(displayValue('fecha_de_pago', v)).toBe(formatDateTime(v));
    expect(displayValue('fecha_de_pago', v)).not.toContain('T18');
  });

  it('muestra un día de calendario sin correrlo de zona', () => {
    expect(displayValue('pagable_desde', '2026-06-22')).toBe(formatDay('2026-06-22'));
  });

  it('muestra los importes en pesos', () => {
    expect(displayValue('importe', '29958.00')).toBe(formatCurrencyExact('29958.00'));
    expect(displayValue('total', '1500')).toBe(formatCurrencyExact('1500'));
  });

  it('deja tal cual un número que no es importe y los textos', () => {
    expect(displayValue('numero_de_operacion', '990011006')).toBe('990011006');
    expect(displayValue('destinatario', 'Seguros Rivadavia')).toBe('Seguros Rivadavia');
  });

  it('sin valor, una raya', () => {
    expect(displayValue('importe', null)).toBe('—');
    expect(displayValue('importe', undefined)).toBe('—');
    expect(displayValue('importe', '')).toBe('—');
  });
});
