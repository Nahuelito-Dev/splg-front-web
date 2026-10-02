import { describe, expect, it } from 'vitest';
import { ALL_TYPES, buildTypeOptions, resolveTypeFilter } from './typeOptions';

describe('typeOptions', () => {
  it('incluye todos los tipos del catálogo, sin repetir y ordenados, también los sin stock', () => {
    const options = buildTypeOptions([{ type: '25kg' }, { type: '10kg' }, { type: '10kg' }]);
    expect(options.map((o) => o.value)).toEqual([ALL_TYPES, '10kg', '25kg']);
    expect(options[0].label).toBe('Todos los tipos');
  });

  it('vuelve a "todos" si el tipo elegido ya no existe', () => {
    const options = buildTypeOptions([{ type: '10kg' }]);
    expect(resolveTypeFilter('10kg', options)).toBe('10kg');
    expect(resolveTypeFilter('45kg', options)).toBe(ALL_TYPES);
  });
});
