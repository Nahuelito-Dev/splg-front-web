import { describe, expect, it } from 'vitest';
import { normalizeSerial, parseSerials, SERIAL_MAX, serialListSchema, serialSchema } from './parseSerials';

describe('parseSerials', () => {
  it('separa por saltos de línea', () => {
    expect(parseSerials('SN-1\nSN-2\nSN-3')).toEqual(['SN-1', 'SN-2', 'SN-3']);
  });

  it('separa por comas y espacios mezclados', () => {
    expect(parseSerials('SN-1, SN-2,SN-3   SN-4')).toEqual(['SN-1', 'SN-2', 'SN-3', 'SN-4']);
  });

  it('descarta vacíos y espacios sueltos', () => {
    expect(parseSerials('  SN-1 ,, \n SN-2  ')).toEqual(['SN-1', 'SN-2']);
  });

  it('cadena vacía no produce seriales', () => {
    expect(parseSerials('   ')).toEqual([]);
  });

  it('los pasa a mayúsculas, como los guarda el back', () => {
    expect(parseSerials('sn-1, Sn-2')).toEqual(['SN-1', 'SN-2']);
    expect(normalizeSerial('  ab-1 ')).toBe('AB-1');
    expect(SERIAL_MAX).toBe(100);
  });
});

describe('serialSchema', () => {
  it('lo pasa a mayúsculas y le saca los espacios de los bordes', () => {
    expect(serialSchema.parse('  sn-000123 ')).toBe('SN-000123');
  });

  it('rechaza vacío, en blanco y de más de 100 caracteres', () => {
    expect(serialSchema.safeParse('   ').success).toBe(false);
    expect(serialSchema.safeParse('a'.repeat(100)).success).toBe(true);
    expect(serialSchema.safeParse('a'.repeat(101)).success).toBe(false);
  });
});

describe('serialListSchema', () => {
  it('pide al menos un serial y ninguno de más de 100 caracteres', () => {
    expect(serialListSchema.safeParse('').success).toBe(false);
    expect(serialListSchema.safeParse('SN-1, SN-2').success).toBe(true);
    expect(serialListSchema.safeParse(`SN-1\n${'x'.repeat(101)}`).success).toBe(false);
  });
});

describe('serialListSchema: sólo separadores', () => {
  it('exige al menos un serial después de separar', () => {
    expect(serialListSchema.safeParse(',,,').success).toBe(false);
    expect(serialListSchema.safeParse(' , \n ').success).toBe(false);
  });
});
