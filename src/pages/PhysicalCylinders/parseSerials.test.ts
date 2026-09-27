import { describe, expect, it } from 'vitest';
import { parseSerials } from './parseSerials';

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
});
