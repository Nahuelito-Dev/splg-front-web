import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { Button, Card, PageHeader } from '../../common/components/ui';
import { FROM_LIST_STATE, usePermissions, useUrlParam } from '../../hooks';
import type { Cylinder } from '../../services/api/types';
import { useCylinders } from '../../services/queries/physicalCylinders';
import { AssignCylindersModal } from './components/AssignCylindersModal';
import { CreateCylinderModal } from './components/CreateCylinderModal';
import { PhysicalCylindersTable } from './components/PhysicalCylindersTable';
import { ALL_STATES } from './cylinderTransitions';
import { StateFilter } from './components/StateFilter';
import { TransitionModal } from './components/TransitionModal';

type StateOrAll = Cylinder['state'] | 'all';

export const PhysicalCylinders = () => {
  const [stateParam, setStateFilter] = useUrlParam('state', 'all');
  const stateFilter: StateOrAll = ALL_STATES.find((state) => state === stateParam) ?? 'all';
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Cylinder | null>(null);

  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const { data: cylinders, isPending } = useCylinders(stateFilter === 'all' ? undefined : stateFilter);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Envases físicos"
        description="Garrafas serializadas y su ciclo de vida: depósito → llenado → reparto → cliente → retorno."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<AssignmentTurnedInIcon />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => setAssignOpen(true)}
            >
              Asignar a pedido
            </Button>
            <Button icon={<AddIcon />} disabled={!canWrite} title={writeHint} onClick={() => setCreateOpen(true)}>
              Nuevo envase
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <StateFilter value={stateFilter} onChange={setStateFilter} />
      </div>

      <Card>
        <PhysicalCylindersTable
          rows={cylinders ?? []}
          loading={isPending}
          onTransition={canWrite ? setTransitionTarget : undefined}
          onView={(cylinder) => navigate(`/physical-cylinders/${cylinder.cylinder_id}`, { state: FROM_LIST_STATE })}
        />
      </Card>

      <CreateCylinderModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <AssignCylindersModal open={assignOpen} onClose={() => setAssignOpen(false)} />
      <TransitionModal
        open={Boolean(transitionTarget)}
        onClose={() => setTransitionTarget(null)}
        cylinder={transitionTarget}
      />
    </div>
  );
};
