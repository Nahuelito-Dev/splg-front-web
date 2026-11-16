import { DateRangeFilter, Input, Select, type SelectOption } from '../../../common/components/ui';
import { AUDIT_ENTITY_OPTIONS } from '../../../utils/auditLabels';
import { AUDIT_ORIGIN_OPTIONS, dataAuditErrors, RECORD_ID_MAX, type DataAuditFilters } from './dataAuditFilters';

interface Props {
  value: DataAuditFilters;
  onChange: (patch: Partial<DataAuditFilters>) => void;
  actionOptions: SelectOption[];
}

export const DataAuditFiltersBar = ({ value, onChange, actionOptions }: Props) => {
  // Una entidad que llega por la URL y no está en el catálogo igual se muestra elegida.
  const entityOptions: SelectOption[] = [
    { value: '', label: 'Todas' },
    ...(value.entity && !AUDIT_ENTITY_OPTIONS.some((o) => o.value === value.entity)
      ? [{ value: value.entity, label: value.entity }]
      : []),
    ...AUDIT_ENTITY_OPTIONS,
  ];
  const errors = dataAuditErrors(value);
  return (
    <>
      <Select
        label="Entidad"
        value={value.entity}
        options={entityOptions}
        onChange={(e) => onChange({ entity: e.target.value })}
      />
      <Input
        label="ID del registro"
        placeholder="UUID"
        maxLength={RECORD_ID_MAX}
        value={value.recordId}
        onChange={(e) => onChange({ recordId: e.target.value })}
      />
      <Select
        label="Acción"
        value={value.actionType}
        options={[{ value: '', label: 'Todas' }, ...actionOptions]}
        onChange={(e) => onChange({ actionType: e.target.value })}
      />
      <Select
        label="Origen"
        value={value.origin}
        options={[{ value: '', label: 'Todos' }, ...AUDIT_ORIGIN_OPTIONS]}
        onChange={(e) => onChange({ origin: e.target.value })}
      />
      <Input
        label="Autor (user_id)"
        placeholder="UUID"
        error={errors.userId}
        value={value.userId}
        onChange={(e) => onChange({ userId: e.target.value })}
      />
      <DateRangeFilter from={value.from} to={value.to} onChange={(range) => onChange(range)} />
    </>
  );
};
