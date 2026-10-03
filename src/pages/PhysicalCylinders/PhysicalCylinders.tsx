import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { PackageCheck, Warehouse } from 'lucide-react';
import {
  Button,
  Card,
  ErrorState,
  FilterChips,
  ListSkeleton,
  PageHeader,
  SearchInput,
  SelectionBar,
  Tabs,
  tabPanelProps,
  type FilterChip,
  type TabItem,
} from '../../common/components/ui';
import { FROM_LIST_STATE, usePermissions, useUrlParams } from '../../hooks';
import type { Cylinder } from '../../services/api/types';
import { useBulkTransitionCylinders, useCylinders } from '../../services/queries/physicalCylinders';
import { notify } from '../../utils/notifications';
import { CYLINDER_STATE, labelOf } from '../../utils/statusLabels';
import { BulkTransitionModal } from './components/BulkTransitionModal';
import { AssignCylindersModal } from './components/AssignCylindersModal';
import { CreateCylinderModal } from './components/CreateCylinderModal';
import { PhysicalCylindersTable } from './components/PhysicalCylindersTable';
import { TransitionModal } from './components/TransitionModal';
import { countCylindersByState, filterCylinders, movable, type CylinderStateFilter } from './cylinderFilters';
import { ALL_STATES } from './cylinderTransitions';

const TABS_ID = 'cylinders';

export const PhysicalCylinders = () => {
  // El estado y la búsqueda viven en la URL: al volver de una ficha o recargar, la lista queda como estaba.
  const [{ state: stateParam, q: term }, setFilters] = useUrlParams({ state: 'all', q: '' });
  const state: CylinderStateFilter = ALL_STATES.find((s) => s === stateParam) ?? 'all';
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Cylinder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulk, setBulk] = useState<{ toState: Cylinder['state']; verb: string } | null>(null);
  // La selección es sólo de lo que se ve: cambiar de pestaña, búsqueda o página la suelta.
  const clearSelection = () => setSelectedIds([]);

  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const { data: cylinders, isPending, isFetching, error, refetch } = useCylinders();
  const bulkTransition = useBulkTransitionCylinders();

  const all = useMemo(() => cylinders ?? [], [cylinders]);
  const counts = useMemo(() => countCylindersByState(all), [all]);
  const rows = useMemo(() => filterCylinders(all, { state, term }), [all, state, term]);
  const selected = useMemo(
    () => all.filter((cylinder) => selectedIds.includes(cylinder.cylinder_id)),
    [all, selectedIds],
  );

  const tabs: TabItem[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    ...ALL_STATES.map((s) => ({
      id: s,
      label: labelOf(CYLINDER_STATE, s).text,
      count: counts[s],
      tone: labelOf(CYLINDER_STATE, s).tone,
    })),
  ];

  const chips: FilterChip[] = [];
  if (state !== 'all') chips.push({ key: 'state', label: labelOf(CYLINDER_STATE, state).text });
  if (term.trim()) chips.push({ key: 'q', label: `"${term.trim()}"` });
  const removeChip = (key: string) => setFilters(key === 'state' ? { state: 'all' } : { q: '' });

  const openBulk = (toState: Cylinder['state'], verb: string) => {
    if (movable(selected, toState).length === 0) {
      notify.error(new Error('Ninguno de los envases marcados puede pasar a ese estado desde el que está'));
      return;
    }
    setBulk({ toState, verb });
  };

  const confirmBulk = () => {
    if (!bulk) return;
    const ids = movable(selected, bulk.toState).map((cylinder) => cylinder.cylinder_id);
    setBulk(null);
    bulkTransition.mutate(
      { ids, toState: bulk.toState },
      { onSuccess: (result) => setSelectedIds([...result.failed.map((f) => f.id), ...result.notRun]) },
    );
  };

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

      <Card>
        {isPending ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState error={error} resource="Los envases" onRetry={() => void refetch()} />
        ) : (
          <>
            <Tabs
              items={tabs}
              value={state}
              onChange={(id) => {
                clearSelection();
                setFilters({ state: id });
              }}
              label="Filtrar envases por estado"
              idPrefix={TABS_ID}
            />
            <div {...tabPanelProps(TABS_ID, state)}>
              <div className="flex flex-col gap-3 border-b border-outline p-4">
                <SearchInput
                  label="Buscar envases"
                  placeholder="Serial, producto o cliente"
                  value={term}
                  onChange={(e) => {
                    clearSelection();
                    setFilters({ q: e.target.value });
                  }}
                />
                <FilterChips
                  items={chips}
                  onRemove={(key) => {
                    clearSelection();
                    removeChip(key);
                  }}
                  onClearAll={() => {
                    clearSelection();
                    setFilters({ state: 'all', q: '' });
                  }}
                  resultCount={rows.length}
                />
              </div>
              {canWrite && (
                <SelectionBar
                  count={selected.length}
                  noun={['envase', 'envases']}
                  onClear={clearSelection}
                  busy={bulkTransition.isPending}
                  onStop={bulkTransition.stop}
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<PackageCheck />}
                    disabled={bulkTransition.isPending}
                    onClick={() => openBulk('filled', 'Marcar como llenos')}
                  >
                    Marcar como llenos
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Warehouse />}
                    disabled={bulkTransition.isPending}
                    onClick={() => openBulk('in_depot', 'Reingresar al depósito')}
                  >
                    Reingresar al depósito
                  </Button>
                </SelectionBar>
              )}
              <PhysicalCylindersTable
                rows={rows}
                loading={isFetching}
                filtered={chips.length > 0}
                selection={canWrite ? { ids: selectedIds, onChange: setSelectedIds } : undefined}
                onPageChange={clearSelection}
                onTransition={canWrite ? setTransitionTarget : undefined}
                onView={(cylinder) =>
                  navigate(`/physical-cylinders/${cylinder.cylinder_id}`, { state: FROM_LIST_STATE })
                }
              />
            </div>
          </>
        )}
      </Card>

      <BulkTransitionModal
        open={bulk !== null}
        onClose={() => setBulk(null)}
        onConfirm={confirmBulk}
        cylinders={bulk ? movable(selected, bulk.toState) : []}
        skipped={bulk ? selected.length - movable(selected, bulk.toState).length : 0}
        toState={bulk?.toState ?? 'filled'}
        verb={bulk?.verb ?? ''}
      />
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
