import { useMemo, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import {
  AnalyticSummary,
  Button,
  Card,
  ErrorState,
  FilterChips,
  ListSkeleton,
  PageHeader,
  SearchInput,
  Tabs,
  tabPanelProps,
  type AnalyticItem,
  type FilterChip,
  type TabItem,
} from '../../common/components/ui';
import { usePermissions, useUrlParams } from '../../hooks';
import type { Claim } from '../../services/api/types';
import { useClaims } from '../../services/queries/claims';
import { CLAIM_STATUS, labelOf } from '../../utils/statusLabels';
import { ClaimDetailDrawer, type PendingAction } from './components/ClaimDetailDrawer';
import { ClaimsTable } from './components/ClaimsTable';
import { EditClaimModal } from './components/EditClaimModal';
import { CreateClaimModal } from './components/CreateClaimModal';
import { CLAIM_STATUS_ORDER, countClaimsByStatus, filterClaims, type ClaimStatusFilter } from './claimFilters';

const TABS_ID = 'claims';

export const Claims = () => {
  const { data: claims, isLoading, isFetching, error, refetch } = useClaims();
  // El estado y la búsqueda viven en la URL: al volver o recargar la lista queda como estaba.
  const [{ status: statusParam, q: term }, setFilters] = useUrlParams({ status: 'all', q: '' });
  const status: ClaimStatusFilter = CLAIM_STATUS_ORDER.find((s) => s === statusParam) ?? 'all';
  const setStatus = (value: string) => setFilters({ status: value });
  const setTerm = (value: string) => setFilters({ q: value });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Claim | null>(null);
  const [startAction, setStartAction] = useState<PendingAction>(null);
  const { canOperate } = usePermissions();

  const all = useMemo(() => claims ?? [], [claims]);
  const counts = useMemo(() => countClaimsByStatus(all), [all]);
  const rows = useMemo(() => filterClaims(all, { status, term }), [all, status, term]);
  // El reclamo abierto sale de la lista: tras resolverlo, el panel muestra el estado nuevo.
  const selected = all.find((claim) => claim.claim_id === selectedId) ?? null;

  const tabs: TabItem[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    ...CLAIM_STATUS_ORDER.map((s) => ({
      id: s,
      label: labelOf(CLAIM_STATUS, s).text,
      count: counts[s],
      tone: labelOf(CLAIM_STATUS, s).tone,
    })),
  ];
  const summary: AnalyticItem[] = CLAIM_STATUS_ORDER.map((s) => ({
    key: s,
    label: labelOf(CLAIM_STATUS, s).text,
    count: counts[s],
    tone: labelOf(CLAIM_STATUS, s).tone,
  }));

  const chips: FilterChip[] = [];
  if (status !== 'all') chips.push({ key: 'status', label: labelOf(CLAIM_STATUS, status).text });
  if (term.trim()) chips.push({ key: 'q', label: `"${term.trim()}"` });
  const removeChip = (key: string) => (key === 'status' ? setStatus('all') : setTerm(''));
  const clearAll = () => setFilters({ status: 'all', q: '' });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Reclamos"
        description="Atención y resolución de reclamos post-venta de los clientes."
        actions={
          <Button icon={<MessageSquarePlus />} onClick={() => setCreating(true)}>
            Cargar reclamo
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <ListSkeleton />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} resource="Los reclamos" onRetry={() => void refetch()} />
        </Card>
      ) : (
        <>
          <AnalyticSummary
            label="Reclamos por estado"
            items={summary}
            selected={status === 'all' ? undefined : status}
            onSelect={(key) => setStatus(key === status ? 'all' : key)}
          />
          <Card>
            <Tabs
              items={tabs}
              value={status}
              onChange={setStatus}
              label="Filtrar reclamos por estado"
              idPrefix={TABS_ID}
            />
            <div {...tabPanelProps(TABS_ID, status)}>
              <div className="flex flex-col gap-3 border-b border-outline p-4">
                <SearchInput
                  label="Buscar reclamos"
                  placeholder="Cliente, teléfono, motivo o n.º de pedido"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
                <FilterChips items={chips} onRemove={removeChip} onClearAll={clearAll} resultCount={rows.length} />
              </div>
              <ClaimsTable
                rows={rows}
                loading={isFetching}
                filtered={chips.length > 0}
                onManage={(claim) => {
                  setStartAction(null);
                  setSelectedId(claim.claim_id);
                }}
                onEdit={canOperate ? setEditing : undefined}
                onReject={
                  canOperate
                    ? (claim) => {
                        setStartAction('reject');
                        setSelectedId(claim.claim_id);
                      }
                    : undefined
                }
              />
            </div>
          </Card>
        </>
      )}

      <ClaimDetailDrawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        claim={selected}
        startAction={startAction}
        onEdit={setEditing}
      />
      <EditClaimModal claim={editing} onClose={() => setEditing(null)} />
      <CreateClaimModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
