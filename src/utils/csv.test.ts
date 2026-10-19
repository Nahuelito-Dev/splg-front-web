import { describe, expect, it } from 'vitest';
import { asText, csvDateTime, csvDay, rowsToCsv } from './csv';

describe('rowsToCsv', () => {
  it('separa con punto y coma y escribe los decimales con coma', () => {
    expect(rowsToCsv(['Producto', 'Monto'], [['10kg', 1234.5]])).toBe('Producto;Monto\n10kg;1234,5');
    expect(rowsToCsv(['Monto'], [[99.9]])).toBe('Monto\n99,9');
  });

  it('entrecomilla lo que tiene separador, comillas, salto de línea o retorno de carro', () => {
    expect(rowsToCsv(['a'], [['x;y'], ['di "hola"'], ['a\nb'], ['a\rb']])).toBe(
      'a\n"x;y"\n"di ""hola"""\n"a\nb"\n"a\rb"',
    );
  });

  it('neutraliza las celdas que una planilla leería como fórmula', () => {
    expect(rowsToCsv(['a'], [['=SUM(A1)'], ['+1'], ['-2+3'], ['@cmd'], ['normal']])).toBe(
      "a\n'=SUM(A1)\n'+1\n'-2+3\n'@cmd\nnormal",
    );
  });

  it('un monto negativo no es una fórmula', () => {
    expect(rowsToCsv(['a'], [[-5], [-7.5]])).toBe('a\n-5\n-7,5');
  });

  it('vacíos y nulos quedan en blanco', () => {
    expect(rowsToCsv(['a', 'b'], [[null, undefined]])).toBe('a;b\n;');
  });
});

describe('texto, números y fechas', () => {
  it('un texto con forma de número sigue siendo texto: no se le cambia el punto', () => {
    expect(rowsToCsv(['a'], [['12.50'], ['007']])).toBe('a\n12.50\n007');
  });

  it('asText fuerza texto para teléfonos y documentos sin perder el cero ni mostrar apóstrofo', () => {
    expect(rowsToCsv(['tel'], [[asText('0341-4123456')], [asText('00123')], [asText(null)]])).toBe(
      'tel\n"=""0341-4123456"""\n"=""00123"""\n',
    );
  });

  it('las fechas salen como AAAA-MM-DD HH:mm y las de calendario como AAAA-MM-DD', () => {
    expect(csvDateTime(new Date(2026, 9, 15, 14, 5))).toBe('2026-10-15 14:05');
    expect(csvDateTime('no es fecha')).toBe('');
    expect(csvDateTime(null)).toBe('');
    expect(csvDay('2026-12-01T00:00:00.000Z')).toBe('2026-12-01');
    expect(csvDay(null)).toBe('');
  });
});
