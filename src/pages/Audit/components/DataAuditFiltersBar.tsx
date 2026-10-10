import { Card, Input, Select, type SelectOption } from '../../../common/components/ui';
import { AUDIT_ENTITY_OPTIONS } from '../../../utils/auditLabels';
import { dataAuditErrors, RECORD_ID_MAX, type DataAuditFilters } from './dataAuditFilters';

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
    <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6">
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
      <Input
        label="Autor (user_id)"
        placeholder="UUID"
        error={errors.userId}
        value={value.userId}
        onChange={(e) => onChange({ userId: e.target.value })}
      />
      <Input label="Desde" type="date" value={value.from} onChange={(e) => onChange({ from: e.target.value })} />
      <Input label="Hasta" type="date" value={value.to} onChange={(e) => onChange({ to: e.target.value })} />
    </Card>
  );
};
