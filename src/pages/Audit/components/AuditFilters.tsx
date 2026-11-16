import { DateRangeFilter, Input, Select } from '../../../common/components/ui';
import type { AuditFiltersState } from './auditFiltersState';

interface Props {
  value: AuditFiltersState;
  onChange: (value: AuditFiltersState) => void;
}

const RESULT_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'success', label: 'Exitosa' },
  { value: 'failure', label: 'Fallida' },
];

export const AuditFilters = ({ value, onChange }: Props) => {
  const set = <K extends keyof AuditFiltersState>(key: K, fieldValue: AuditFiltersState[K]) =>
    onChange({ ...value, [key]: fieldValue });

  return (
    <>
      <Input
        label="Recurso"
        placeholder="orders, ratings…"
        value={value.resource}
        onChange={(e) => set('resource', e.target.value)}
      />
      <Input
        label="ID del recurso"
        placeholder="UUID"
        value={value.resourceId}
        onChange={(e) => set('resourceId', e.target.value)}
      />
      <Input
        label="Autor (user_id)"
        placeholder="UUID"
        value={value.actorUserId}
        onChange={(e) => set('actorUserId', e.target.value)}
      />
      <Select
        label="Resultado"
        value={value.result}
        onChange={(e) => set('result', e.target.value as AuditFiltersState['result'])}
        options={RESULT_OPTIONS}
      />
      <DateRangeFilter
        from={value.desde}
        to={value.hasta}
        onChange={(range) => onChange({ ...value, desde: range.from, hasta: range.to })}
      />
    </>
  );
};
