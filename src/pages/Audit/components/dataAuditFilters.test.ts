import { describe, expect, it } from 'vitest';
import { auditHistoryPath } from '../../../utils/auditLabels';
import { dataAuditChips, dataAuditErrors, EMPTY_DATA_AUDIT_FILTERS, toAuditEntriesParams } from './dataAuditFilters';

describe('toAuditEntriesParams', () => {
  it('sin filtros sólo manda la página', () => {
    expect(toAuditEntriesParams(EMPTY_DATA_AUDIT_FILTERS, 1, 25)).toEqual({
      entity: undefined,
      recordId: undefined,
      userId: undefined,
      actionType: undefined,
      origin: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 25,
    });
  });

  it('manda entidad, registro y acción; el día "hasta" cubre el día entero', () => {
    const params = toAuditEntriesParams(
      {
        ...EMPTY_DATA_AUDIT_FILTERS,
        entity: 'Order',
        recordId: ' abc ',
        actionType: '3',
        from: '2026-10-01',
        to: '2026-10-02',
      },
      2,
      50,
    );
    expect(params).toMatchObject({ entity: 'Order', recordId: 'abc', actionType: 3, page: 2, limit: 50 });
    expect(new Date(params.from as string).getTime()).toBe(new Date('2026-10-01T00:00:00').getTime());
    expect(new Date(params.to as string).getTime()).toBe(new Date('2026-10-02T23:59:59.999').getTime());
  });

  it('ignora una fecha o una acción que no son válidas', () => {
    const params = toAuditEntriesParams(
      { ...EMPTY_DATA_AUDIT_FILTERS, actionType: 'x', from: '2026-13-45', to: 'ayer' },
      1,
      10,
    );
    expect(params.actionType).toBeUndefined();
    expect(params.from).toBeUndefined();
    expect(params.to).toBeUndefined();
  });
});

describe('dataAuditChips', () => {
  it('un chip por filtro, con la entidad y la acción en castellano', () => {
    const chips = dataAuditChips({ ...EMPTY_DATA_AUDIT_FILTERS, entity: 'Order', actionType: '3' }, (id) =>
      id === 3 ? 'Baja lógica' : undefined,
    );
    expect(chips).toEqual([
      { key: 'entity', label: 'Entidad: Pedido' },
      { key: 'actionType', label: 'Acción: Baja lógica' },
    ]);
  });
});

describe('auditHistoryPath', () => {
  it('arma el enlace de «ver historial de cambios» con entidad y registro', () => {
    expect(auditHistoryPath('Order', 'abc-123')).toBe('/audit?entity=Order&recordId=abc-123');
  });
});

describe('filtros inválidos', () => {
  const UUID = '5baddc17-24e6-4a69-9e11-45f321956d60';

  it('un autor que no es UUID no se manda, no tiene chip y marca el campo', () => {
    const filters = { ...EMPTY_DATA_AUDIT_FILTERS, userId: '5baddc17-24e6' };
    expect(toAuditEntriesParams(filters, 1, 25).userId).toBeUndefined();
    expect(dataAuditChips(filters, () => undefined)).toEqual([]);
    expect(dataAuditErrors(filters)).toEqual({ userId: 'UUID inválido' });
  });

  it('un UUID completo sí se manda y tiene chip', () => {
    const filters = { ...EMPTY_DATA_AUDIT_FILTERS, userId: UUID };
    expect(toAuditEntriesParams(filters, 1, 25).userId).toBe(UUID);
    expect(dataAuditChips(filters, () => undefined)).toHaveLength(1);
    expect(dataAuditErrors(filters)).toEqual({});
  });

  it('fechas y acción inválidas no se piden ni muestran chip: «hay filtros» coincide con lo que se aplica', () => {
    const filters = { ...EMPTY_DATA_AUDIT_FILTERS, from: '2026-13-45', to: 'ayer', actionType: 'x' };
    expect(dataAuditChips(filters, () => undefined)).toEqual([]);
  });

  it('el id de registro se corta en 64 caracteres (MaxLength del back)', () => {
    const params = toAuditEntriesParams({ ...EMPTY_DATA_AUDIT_FILTERS, recordId: 'a'.repeat(100) }, 1, 25);
    expect(params.recordId).toHaveLength(64);
  });
});

describe('filtro de origen', () => {
  it('se manda como `origin` y tiene su chip', () => {
    const filters = { ...EMPTY_DATA_AUDIT_FILTERS, origin: 'direct' };
    expect(toAuditEntriesParams(filters, 1, 25).origin).toBe('direct');
    expect(dataAuditChips(filters, () => undefined)).toEqual([{ key: 'origin', label: 'Origen: Directo en la base' }]);
  });

  it('un origen que no existe no se manda ni tiene chip', () => {
    const filters = { ...EMPTY_DATA_AUDIT_FILTERS, origin: 'otro' };
    expect(toAuditEntriesParams(filters, 1, 25).origin).toBeUndefined();
    expect(dataAuditChips(filters, () => undefined)).toEqual([]);
  });
});
