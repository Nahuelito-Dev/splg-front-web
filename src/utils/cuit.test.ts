import { describe, expect, it } from 'vitest';
import { formatCuit, isValidCuil, isValidCuit, normalizeCuit } from './cuit';

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

describe('cuil', () => {
  it('acepta uno de persona humana con dígito verificador correcto', () => {
    expect(isValidCuil('20123456786')).toBe(true);
  });

  it('rechaza el prefijo de persona jurídica y el dígito verificador incorrecto', () => {
    expect(isValidCuil('30715123459')).toBe(false);
    expect(isValidCuil('20123456781')).toBe(false);
  });
});
