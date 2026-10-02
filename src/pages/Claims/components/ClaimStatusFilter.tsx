import { Button } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';
import { CLAIM_STATUS, labelOf } from '../../../utils/statusLabels';

type StatusOrAll = Claim['status'] | 'all';

const ALL_STATUSES: Claim['status'][] = ['pending', 'in_process', 'resolved', 'rejected'];

interface Props {
  value: StatusOrAll;
  onChange: (value: StatusOrAll) => void;
}

/** Pestañas por estado del reclamo (CU-025): pills sobre los botones del kit. */
export const ClaimStatusFilter = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
    <Button size="sm" variant={value === 'all' ? 'primary' : 'secondary'} onClick={() => onChange('all')}>
      Todos
    </Button>
    {ALL_STATUSES.map((status) => (
      <Button
        key={status}
        size="sm"
        variant={value === status ? 'primary' : 'secondary'}
        onClick={() => onChange(status)}
      >
        {labelOf(CLAIM_STATUS, status).text}
      </Button>
    ))}
  </div>
);
