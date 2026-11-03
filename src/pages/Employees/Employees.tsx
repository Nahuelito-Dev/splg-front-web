import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { UserPlus } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Tabs,
  tabPanelProps,
  type FilterChip,
  type TabItem,
  PageContainer,
  TableToolbar,
} from '../../common/components/ui';
import { useDebounce, usePermissions, useUrlParams } from '../../hooks';
import { employeeQuery } from '../../services/api/employees';
import type { Employee, JobPosition } from '../../services/api/types';
import { useEmployees, useEmployeeStatusCounts, useJobPositions } from '../../services/queries/employees';

import { EmployeesTable } from './components/EmployeesTable';
import {
  DOCUMENT_STATUS_LABELS,
  EMPLOYEE_STATUS_LABELS,
  POSITION_CATEGORY_LABELS,
  type DocumentStatus,
} from './employeeLabels';

const TABS_ID = 'employees';
const PAGE_SIZE = 10;
const STATUSES = ['all', 'active', 'terminated'] as const;
type Segment = (typeof STATUSES)[number];
const SEGMENT_LABELS: Record<Segment, string> = { all: 'Todos', ...EMPLOYEE_STATUS_LABELS };

export const Employees = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const [{ q: search, status: statusParam, category, position, docs, page: pageParam }, setFilters] = useUrlParams({
    q: '',
    status: 'all',
    category: '',
    position: '',
    docs: '',
    page: '1',
  });
  const debouncedSearch = useDebounce(search.trim());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(pageParam) - 1 || 0), pageSize: PAGE_SIZE };
  const positions = useJobPositions(!needsDistributor);

  const segment: Segment = STATUSES.find((s) => s === statusParam) ?? 'all';
  const categoryFilter = (Object.keys(POSITION_CATEGORY_LABELS) as JobPosition['category'][]).find(
    (c) => c === category,
  );
  const documentFilter = (Object.keys(DOCUMENT_STATUS_LABELS) as DocumentStatus[]).find((d) => d === docs);
  // Un `?position=` que no es un puesto de la distribuidora se ignora; hasta que carguen los puestos no se consulta.
  const positionFilter = positions.data?.find((p) => p.positionId === position);
  const listFilters = {
    q: debouncedSearch || undefined,
    status: segment === 'all' ? undefined : (segment satisfies Employee['status']),
    category: categoryFilter,
    positionId: positionFilter?.positionId,
    documentStatus: documentFilter,
  };
  const server = useEmployees(pagination, listFilters, !needsDistributor && (!position || !positions.isPending));
  const counts = useEmployeeStatusCounts(
    {
      q: debouncedSearch || undefined,
      category: categoryFilter,
      positionId: positionFilter?.positionId,
      documentStatus: documentFilter,
    },
    !needsDistributor && (!position || !positions.isPending),
  );
  const rows = server.data?.rows ?? [];
  const total = server.data?.total ?? 0;
  const loading = server.isFetching;
  useEffect(() => {
    if (!loading && total > 0 && rows.length === 0 && pagination.page > 0) setFilters({ page: '1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, total, rows.length, pagination.page]);

  const tabs: TabItem[] = STATUSES.map((s) => ({
    id: s,
    label: SEGMENT_LABELS[s],
    count: s === 'terminated' ? counts.terminated : counts[s],
    tone: s === 'active' ? 'success' : undefined,
  }));

  const chips: FilterChip[] = [];
  if (segment !== 'all') chips.push({ key: 'status', label: SEGMENT_LABELS[segment] });
  if (categoryFilter) chips.push({ key: 'category', label: POSITION_CATEGORY_LABELS[categoryFilter] });
  if (positionFilter) chips.push({ key: 'position', label: positionFilter.name });
  if (documentFilter)
    chips.push({ key: 'docs', label: `Documentación: ${DOCUMENT_STATUS_LABELS[documentFilter].text}` });
  if (search.trim()) chips.push({ key: 'q', label: `"${search.trim()}"` });
  const removeChip = (key: string) => setFilters({ [key]: key === 'status' ? 'all' : '', page: '1' });

  return (
    <PageContainer>
      <PageHeader
        title="Legajos"
        description="El personal de la distribuidora: datos, foto y documentación de cada legajo."
        actions={
          <Button icon={<UserPlus />} blockedReason={writeHint} onClick={() => canWrite && navigate('/employees/new')}>
            Nuevo legajo
          </Button>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus legajos."
          />
        </Card>
      ) : server.error ? (
        <Card className="p-6">
          <ErrorState error={server.error} resource="Los legajos" onRetry={() => void server.refetch()} />
        </Card>
      ) : (
        <Card>
          <Tabs
            items={tabs}
            value={segment}
            onChange={(id) => setFilters({ status: id, page: '1' })}
            label="Filtrar legajos por estado"
            idPrefix={TABS_ID}
          />
          <div {...tabPanelProps(TABS_ID, segment)}>
            <TableToolbar
              filters={
                <>
                  <Select
                    label="Categoría"
                    value={category}
                    onChange={(e) => setFilters({ category: e.target.value, page: '1' })}
                    options={[
                      { value: '', label: 'Todas' },
                      ...Object.entries(POSITION_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
                    ]}
                  />
                  <Select
                    label="Puesto"
                    value={position}
                    onChange={(e) => setFilters({ position: e.target.value, page: '1' })}
                    options={[
                      { value: '', label: 'Todos' },
                      ...(positions.data ?? []).map((p) => ({ value: p.positionId, label: p.name })),
                    ]}
                  />
                  <Select
                    label="Documentación"
                    value={docs}
                    onChange={(e) => setFilters({ docs: e.target.value, page: '1' })}
                    options={[
                      { value: '', label: 'Todas' },
                      ...Object.entries(DOCUMENT_STATUS_LABELS).map(([value, { text }]) => ({ value, label: text })),
                    ]}
                  />
                </>
              }
              search={{
                label: 'Buscar legajos',
                placeholder: 'Nombre, apellido o número de legajo',
                value: search,
                onChange: (value) => setFilters({ q: value, page: '1' }),
              }}
              serverExport={{
                resource: 'legajos',
                params: employeeQuery(listFilters),
                blockedReason: position && positions.isPending ? 'Esperá a que carguen los puestos' : undefined,
              }}
              chips={chips}
              onRemoveChip={removeChip}
              onClearChips={() => setFilters({ q: '', status: 'all', category: '', position: '', docs: '', page: '1' })}
              resultCount={server.data ? total : undefined}
              noun={['legajo', 'legajos']}
            />
            <EmployeesTable
              rows={rows}
              total={total}
              loading={loading}
              filtered={chips.length > 0}
              emptyDescription={
                documentFilter && segment === 'terminated'
                  ? 'Los legajos egresados no tienen estado de documentación: quitá el filtro «Documentación» para verlos.'
                  : undefined
              }
              pagination={pagination}
              onPaginationChange={(model) => setFilters({ page: String(model.page + 1) })}
            />
          </div>
        </Card>
      )}
    </PageContainer>
  );
};
