import { describe, expect, it } from 'vitest';
import { auditFilterChips, EMPTY_AUDIT_FILTERS } from './auditFiltersState';

describe('auditFilterChips', () => {
  it('sin filtros no hay chips', () => {
    expect(auditFilterChips(EMPTY_AUDIT_FILTERS)).toEqual([]);
  });

  it('un chip por filtro activo, con la clave del campo', () => {
    const chips = auditFilterChips({
      ...EMPTY_AUDIT_FILTERS,
      resource: 'orders',
      result: 'failure',
      desde: '2026-10-01',
    });
    expect(chips).toEqual([
      { key: 'resource', label: 'Recurso: orders' },
      { key: 'result', label: 'Resultado: Fallida' },
      { key: 'desde', label: 'Desde 2026-10-01' },
    ]);
  });
});
