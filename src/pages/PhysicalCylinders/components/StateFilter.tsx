import { Button } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';
import { ALL_STATES } from '../cylinderTransitions';

type StateOrAll = Cylinder['state'] | 'all';

interface Props {
  value: StateOrAll;
  onChange: (value: StateOrAll) => void;
}

/** Filtro por estado del envase: pills sobre los botones del kit. */
export const StateFilter = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
    <Button size="sm" variant={value === 'all' ? 'primary' : 'secondary'} onClick={() => onChange('all')}>
      Todos
    </Button>
    {ALL_STATES.map((state) => (
      <Button key={state} size="sm" variant={value === state ? 'primary' : 'secondary'} onClick={() => onChange(state)}>
        {labelOf(CYLINDER_STATE, state).text}
      </Button>
    ))}
  </div>
);
