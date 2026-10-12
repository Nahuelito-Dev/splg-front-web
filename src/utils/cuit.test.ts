import { describe, expect, it } from 'vitest';
import { formatCuit, isValidCuit, normalizeCuit } from './cuit';

describe('cuit', () => {
  it.each(['30715123459', '20123456786', '27-23456789-1'])('acepta %s', (cuit) =>
    expect(isValidCuit(normalizeCuit(cuit))).toBe(true),
  );

  it.each([
    ['dígito verificador incorrecto', '30715123456'],
    ['prefijo inexistente', '10715123459'],
    ['corto', '3071512345'],
    ['con letras', '3071512345a'],
  ])('rechaza %s', (_motivo, cuit) => expect(isValidCuit(cuit)).toBe(false));

  it('normaliza guiones y espacios', () => expect(normalizeCuit(' 30-71512345 9 ')).toBe('30715123459'));

  it('formatea con guiones', () => expect(formatCuit('30715123459')).toBe('30-71512345-9'));
});
