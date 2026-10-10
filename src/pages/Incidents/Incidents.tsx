import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import {
  AnalyticSummary,
  Button,
  Card,
  ErrorState,
  FilterChips,
  ListSkeleton,
  PageHeader,
  SearchInput,
  Select,
  Tabs,
  tabPanelProps,
  type AnalyticItem,
  type FilterChip,
  type TabItem,
} from '../../common/components/ui';
import { usePermissions, useUrlParams } from '../../hooks';
import { useIncidents } from '../../services/queries/incidents';
import type { Incident } from '../../services/api/types';
import { INCIDENT_STATUS, INCIDENT_TYPE, labelOf } from '../../utils/statusLabels';
import { CreateIncidentModal } from './components/CreateIncidentModal';
import { DiscardIncidentModal } from './components/DiscardIncidentModal';
import { EditIncidentModal } from './components/EditIncidentModal';
import { IncidentDetailDrawer } from './components/IncidentDetailDrawer';
import { IncidentsTable } from './components/IncidentsTable';
import {
  INCIDENT_STATUS_ORDER,
  INCIDENT_TYPE_ORDER,
  countIncidentsByStatus,
  filterIncidents,
  type IncidentStatusFilter,
  type IncidentTypeFilter,
} from './incidentFilters';

const TABS_ID = 'incidents';

const STATUS_PLURAL: Record<Incident['status'], string> = {
  open: 'Abiertas',
  resolved: 'Resueltas',
  discarded: 'Descartadas',
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  ...INCIDENT_TYPE_ORDER.map((type) => ({ value: type, label: labelOf(INCIDENT_TYPE, type).text })),
];

export const Incidents = () => {
  const { data: incidents, isLoading, isFetching, error, refetch } = useIncidents();
  const [{ status: statusParam, type: typeParam, q: term }, setFilters] = useUrlParams({
    status: 'all',
    type: 'all',
    q: '',
  });
  const setStatus = (value: string) => setFilters({ status: value });
  const setType = (value: string) => setFilters({ type: value });
  const setTerm = (value: string) => setFilters({ q: value });
  const status: IncidentStatusFilter = INCIDENT_STATUS_ORDER.find((s) => s === statusParam) ?? 'all';
  const type: IncidentTypeFilter = INCIDENT_TYPE_ORDER.find((t) => t === typeParam) ?? 'all';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [discarding, setDiscarding] = useState<Incident | null>(null);
  const { canOperate } = usePermissions();

  const all = useMemo(() => incidents ?? [], [incidents]);
  const counts = useMemo(() => countIncidentsByStatus(all), [all]);
  const rows = useMemo(() => filterIncidents(all, { status, type, term }), [all, status, type, term]);
  const selected = all.find((incident) => incident.incident_id === selectedId) ?? null;

  const tabs: TabItem[] = [
    { id: 'all', label: 'Todas', count: counts.all },
    ...INCIDENT_STATUS_ORDER.map((s) => ({
      id: s,
      label: STATUS_PLURAL[s],
      count: counts[s],
      tone: labelOf(INCIDENT_STATUS, s).tone,
    })),
  ];
  const summary: AnalyticItem[] = INCIDENT_STATUS_ORDER.map((s) => ({
    key: s,
    label: STATUS_PLURAL[s],
    count: counts[s],
    tone: labelOf(INCIDENT_STATUS, s).tone,
  }));

  const chips: FilterChip[] = [];
  if (status !== 'all') chips.push({ key: 'status', label: labelOf(INCIDENT_STATUS, status).text });
  if (type !== 'all') chips.push({ key: 'type', label: labelOf(INCIDENT_TYPE, type).text });
  if (term.trim()) chips.push({ key: 'q', label: `"${term.trim()}"` });
  const removeChip = (key: string) => {
    if (key === 'status') setStatus('all');
    else if (key === 'type') setType('all');
    else setTerm('');
  };
  const clearAll = () => setFilters({ status: 'all', type: 'all', q: '' });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Incidencias de reparto"
        description="Problemas reportados por los choferes durante la entrega."
        actions={
          <Button icon={<TriangleAlert />} onClick={() => setCreating(true)}>
            Registrar incidencia
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <ListSkeleton />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} resource="Las incidencias" onRetry={() => void refetch()} />
        </Card>
      ) : (
        <>
          <AnalyticSummary
            label="Incidencias por estado"
            items={summary}
            selected={status === 'all' ? undefined : status}
            onSelect={(key) => setStatus(key === status ? 'all' : key)}
          />
          <Card>
            <Tabs
              items={tabs}
              value={status}
              onChange={setStatus}
              label="Filtrar incidencias por estado"
              idPrefix={TABS_ID}
            />
            <div {...tabPanelProps(TABS_ID, status)}>
              <div className="flex flex-col gap-3 border-b border-outline p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <SearchInput
                    label="Buscar incidencias"
                    placeholder="Cliente, teléfono o n.º de pedido"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                  <Select
                    label="Tipo"
                    className="sm:w-48"
                    value={type}
                    options={TYPE_OPTIONS}
                    onChange={(e) => setType(e.target.value)}
                  />
                </div>
                <FilterChips items={chips} onRemove={removeChip} onClearAll={clearAll} resultCount={rows.length} />
              </div>
              <IncidentsTable
                rows={rows}
                loading={isFetching}
                filtered={chips.length > 0}
                onView={(incident) => setSelectedId(incident.incident_id)}
                onEdit={canOperate ? setEditing : undefined}
                onDiscard={canOperate ? setDiscarding : undefined}
              />
            </div>
          </Card>
        </>
      )}

      <IncidentDetailDrawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        incident={selected}
        onEdit={setEditing}
        onDiscard={setDiscarding}
      />
      <EditIncidentModal incident={editing} onClose={() => setEditing(null)} />
      <DiscardIncidentModal incident={discarding} onClose={() => setDiscarding(null)} />
      <CreateIncidentModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
