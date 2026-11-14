import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import {
  Button,
  Card,
  DateRangeFilter,
  ErrorState,
  PageContainer,
  PageHeader,
  Select,
  TableToolbar,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useUrlPagedParams } from '../../hooks';
import { RequestSupportModal } from '../../common/support/RequestSupportModal';
import type { CompanyListItem } from '../../services/api/types';
import { usePlatformCompanies } from '../../services/queries/platformConsole';
import { DistributorsTable } from './components/DistributorsTable';
import { useDistributorActions } from './useDistributorActions';
import { useEnterOwnedCompany } from '../Platform/useEnterOwnedCompany';
import { companyFilterChips, EMPTY_COMPANY_FILTERS, type CompanyFilters } from './companyFilters';

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'suspended', label: 'Suspendidas' },
];

const OWNED_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Sólo la propia' },
  { value: 'false', label: 'Sin la propia' },
];

/**
 * Las distribuidoras (empresas) de la plataforma, sólo para el administrador general: la propia primero, con sus
 * números del período. Para ver los datos de una empresa se pide acceso de soporte (la empresa lo aprueba, es sólo
 * lectura y vence solo); a la empresa propia se entra directo.
 */
export const Distributors = () => {
  const [supportFor, setSupportFor] = useState<string | null>(null);
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams<keyof CompanyFilters>(
    EMPTY_COMPANY_FILTERS,
    25,
  );
  const { data, isFetching, error, refetch } = usePlatformCompanies({
    status: (filters.status || undefined) as CompanyListItem['status'] | undefined,
    ownedByPlatform: filters.owned === '' ? undefined : filters.owned === 'true',
    from: filters.from,
    to: filters.to,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });
  const navigate = useNavigate();
  const { toggleStatus, remove } = useDistributorActions();
  const enterOwned = useEnterOwnedCompany();
  const chips = companyFilterChips(filters);

  return (
    <PageContainer>
      <PageHeader
        title="Distribuidoras"
        description="Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo. Sin fechas, los números son del mes en curso."
        actions={
          <Button icon={<AddBusinessIcon />} onClick={() => navigate('/distributors/new')}>
            Nueva empresa
          </Button>
        }
      />

      <Card>
        <TableToolbar
          filters={
            <>
              <Select
                label="Estado"
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                options={STATUS_OPTIONS}
              />
              <Select
                label="Empresa propia"
                value={filters.owned}
                onChange={(e) => setFilters({ owned: e.target.value })}
                options={OWNED_OPTIONS}
              />
              <DateRangeFilter
                from={filters.from}
                to={filters.to}
                onChange={(range) => setFilters(range)}
                label="Período"
              />
            </>
          }
          chips={chips}
          onRemoveChip={(key) => setFilters({ [key]: '' })}
          onClearChips={() => setFilters(EMPTY_COMPANY_FILTERS)}
          resultCount={data?.total}
          noun={['empresa', 'empresas']}
        />
        {error ? (
          <ErrorState error={error} resource="Las empresas" onRetry={() => void refetch()} />
        ) : (
          <DistributorsTable
            rows={data?.items ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={setPagination}
            filtered={chips.length > 0}
            onRequestSupport={(company) => setSupportFor(company.id)}
            onEnterOwned={enterOwned}
            onView={(company) => navigate(`/distributors/${company.id}`, { state: FROM_LIST_STATE })}
            onEdit={(company) => navigate(`/distributors/${company.id}/edit`)}
            onToggleStatus={(company) => void toggleStatus(company)}
            onDelete={(company) => void remove(company)}
          />
        )}
      </Card>
      <RequestSupportModal
        open={supportFor !== null}
        onClose={() => setSupportFor(null)}
        distributorId={supportFor ?? undefined}
      />
    </PageContainer>
  );
};
