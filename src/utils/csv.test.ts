import { describe, expect, it } from 'vitest';
import { rowsToCsv } from './csv';

describe('rowsToCsv', () => {
  it('separa con punto y coma y escribe los decimales con coma', () => {
    expect(rowsToCsv(['Producto', 'Monto'], [['10kg', 1234.5]])).toBe('Producto;Monto\n10kg;1234,5');
    expect(rowsToCsv(['Monto'], [['99.90']])).toBe('Monto\n99,90');
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
    expect(rowsToCsv(['a'], [[-5], ['-7.5']])).toBe('a\n-5\n-7,5');
  });

  it('vacíos y nulos quedan en blanco', () => {
    expect(rowsToCsv(['a', 'b'], [[null, undefined]])).toBe('a;b\n;');
  });
});
