import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GridPaginationModel } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { CalendarClock, PackageCheck, Warehouse } from 'lucide-react';
import {
  AnalyticSummary,
  Button,
  Card,
  ErrorState,
  ExportCsvButton,
  FilterChips,
  ListSkeleton,
  PageHeader,
  SearchInput,
  Select,
  SelectionBar,
  Tabs,
  tabPanelProps,
  type AnalyticItem,
  type FilterChip,
  type TabItem,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useDebounce, usePermissions, useUrlParams } from '../../hooks';
import type { Cylinder } from '../../services/api/types';
import { useUserNames } from '../../services/queries/userNames';
import {
  useBulkTransitionCylinders,
  useCylinderStateCounts,
  useCylinders,
} from '../../services/queries/physicalCylinders';
import { formatShortId } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { CYLINDER_STATE, VIGENCIA_FILTER_LABEL, labelOf } from '../../utils/statusLabels';
import { BulkTransitionModal } from './components/BulkTransitionModal';
import { AssignCylindersModal } from './components/AssignCylindersModal';
import { CylinderFormModal } from './components/CylinderFormModal';
import { RetireCylinderModal } from './components/RetireCylinderModal';
import { PhysicalCylindersTable } from './components/PhysicalCylindersTable';
import { TransitionModal } from './components/TransitionModal';
import { movable, uuidOrUndefined, type CylinderStateFilter } from './cylinderFilters';
import { ALL_STATES } from './cylinderTransitions';
import { asText, csvDateTime } from '../../utils/csv';

const TABS_ID = 'cylinders';
const PAGE_SIZE = 10;
const VIGENCIAS = ['valid', 'expired', 'unverified', 'dispatchable'] as const;

export const PhysicalCylinders = () => {
  // El estado, el pedido, el cliente, la búsqueda y la página viven en la URL: al volver de una ficha o recargar, la
  // lista queda como estaba. `order` y `customer` (user_id) llegan desde las fichas del pedido y del cliente.
  const [
    {
      state: stateParam,
      q: term,
      order: orderParam,
      customer: customerParam,
      vigencia: vigenciaParam,
      page: pageParam,
    },
    setFilters,
  ] = useUrlParams({ state: 'all', q: '', order: '', customer: '', vigencia: '', page: '1' });
  const debouncedTerm = useDebounce(term.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize: PAGE_SIZE };
  const setPagination = (model: GridPaginationModel) => setFilters({ page: String(model.page + 1) });
  const state: CylinderStateFilter = ALL_STATES.find((s) => s === stateParam) ?? 'all';
  const vigencia = VIGENCIAS.find((v) => v === vigenciaParam);
  const [form, setForm] = useState<{ open: boolean; cylinder: Cylinder | null }>({ open: false, cylinder: null });
  const [retireTarget, setRetireTarget] = useState<Cylinder | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<Cylinder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulk, setBulk] = useState<{ toState: Cylinder['state']; verb: string } | null>(null);
  // La selección es sólo de lo que se ve: cambiar de pestaña, búsqueda o página la suelta.
  const clearSelection = () => setSelectedIds([]);

  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  // Un `?order=` o `?customer=` que no es UUID (enlace viejo o escrito a mano) se ignora y se avisa: la API lo rechazaría.
  const orderId = uuidOrUndefined(orderParam) ?? '';
  const customerUserId = uuidOrUndefined(customerParam) ?? '';
  const scope = { orderId: orderId || undefined, customerUserId: customerUserId || undefined };
  const { data, isPending, isFetching, error, refetch } = useCylinders(
    { ...scope, state: state === 'all' ? undefined : state, vigencia },
    pagination,
    debouncedTerm,
  );
  const counts = useCylinderStateCounts({ ...scope, vigencia });
  const customerNames = useUserNames([customerUserId]);
  const bulkTransition = useBulkTransitionCylinders();

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const total = data?.total ?? 0;
  // Una `?page=` fuera de rango vuelve a la primera.
  useEffect(() => {
    if (data && !isFetching && total > 0 && rows.length === 0 && pagination.page > 0) setFilters({ page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isFetching, total, rows.length, pagination.page]);
  const selected = useMemo(
    () => rows.filter((cylinder) => selectedIds.includes(cylinder.cylinder_id)),
    [rows, selectedIds],
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

  const summary: AnalyticItem[] = ALL_STATES.map((s) => ({
    key: s,
    label: labelOf(CYLINDER_STATE, s).text,
    count: counts[s],
    tone: labelOf(CYLINDER_STATE, s).tone,
  }));
  const CSV_HEADERS = ['Serial', 'Producto', 'Estado', 'En poder de', 'Último movimiento'];
  const toCsvRows = (list: Cylinder[]) =>
    list.map((cylinder) => [
      asText(cylinder.serial),
      cylinder.gas_cylinder ? `${cylinder.gas_cylinder.type} ${cylinder.gas_cylinder.weight} kg` : '',
      labelOf(CYLINDER_STATE, cylinder.state).text,
      cylinder.current_customer?.full_name ?? 'La distribuidora',
      csvDateTime(cylinder.lastMovementAt),
    ]);

  const chips: FilterChip[] = [];
  if (state !== 'all') chips.push({ key: 'state', label: labelOf(CYLINDER_STATE, state).text });
  if (orderId) chips.push({ key: 'order', label: `Pedido ${formatShortId(orderId)}` });
  if (customerUserId)
    chips.push({
      key: 'customer',
      label: `Cliente: ${customerNames.nameOf(customerUserId) ?? formatShortId(customerUserId)}`,
    });
  if (orderParam && !orderId) chips.push({ key: 'order', label: 'Pedido no válido (se ignora)' });
  if (customerParam && !customerUserId) chips.push({ key: 'customer', label: 'Cliente no válido (se ignora)' });
  if (vigencia) chips.push({ key: 'vigencia', label: VIGENCIA_FILTER_LABEL[vigencia] });
  if (term.trim()) chips.push({ key: 'q', label: `"${term.trim()}"` });
  const removeChip = (key: string) => setFilters({ [key]: key === 'state' ? 'all' : '', page: '1' });

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
              icon={<CalendarClock />}
              onClick={() => navigate('/physical-cylinders/expirations')}
            >
              Vencimientos
            </Button>
            <Button
              variant="secondary"
              icon={<AssignmentTurnedInIcon />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => setAssignOpen(true)}
            >
              Asignar a pedido
            </Button>
            <Button
              icon={<AddIcon />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => setForm({ open: true, cylinder: null })}
            >
              Nuevo envase
            </Button>
          </>
        }
      />

      <AnalyticSummary
        label="Envases por estado"
        items={summary}
        selected={state === 'all' ? undefined : state}
        onSelect={(key) => {
          clearSelection();
          setFilters({ state: key === state ? 'all' : key, page: '1' });
        }}
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
                setFilters({ state: id, page: '1' });
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
                    setFilters({ q: e.target.value, page: '1' });
                  }}
                />
                <Select
                  label="Vigencia de la revisión"
                  value={vigencia ?? ''}
                  onChange={(e) => {
                    clearSelection();
                    setFilters({ vigencia: e.target.value, page: '1' });
                  }}
                  options={[
                    { value: '', label: 'Todas' },
                    ...VIGENCIAS.map((v) => ({ value: v, label: VIGENCIA_FILTER_LABEL[v] })),
                  ]}
                />
                <FilterChips
                  items={chips}
                  onRemove={(key) => {
                    clearSelection();
                    removeChip(key);
                  }}
                  onClearAll={() => {
                    clearSelection();
                    setFilters({ state: 'all', q: '', order: '', customer: '', vigencia: '', page: '1' });
                  }}
                  resultCount={data ? total : undefined}
                />
                <div>
                  <ExportCsvButton
                    filename="envases"
                    label={selected.length > 0 ? 'Exportar selección' : 'Exportar CSV'}
                    headers={CSV_HEADERS}
                    rows={toCsvRows(selected.length > 0 ? selected : rows)}
                  />
                </div>
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
                total={total}
                loading={isFetching}
                pagination={pagination}
                onPaginationChange={setPagination}
                filtered={chips.length > 0}
                selection={canWrite ? { ids: selectedIds, onChange: setSelectedIds } : undefined}
                onPageChange={clearSelection}
                onTransition={canWrite ? setTransitionTarget : undefined}
                onEdit={canWrite ? (cylinder) => setForm({ open: true, cylinder }) : undefined}
                onRetire={canWrite ? setRetireTarget : undefined}
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
      <CylinderFormModal
        open={form.open}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        cylinder={form.cylinder}
      />
      <RetireCylinderModal cylinder={retireTarget} onClose={() => setRetireTarget(null)} />
      <AssignCylindersModal open={assignOpen} onClose={() => setAssignOpen(false)} />
      <TransitionModal
        open={Boolean(transitionTarget)}
        onClose={() => setTransitionTarget(null)}
        cylinder={transitionTarget}
      />
    </div>
  );
};
