import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { Button, Card, ErrorState, PageHeader, TableSkeleton, PageContainer } from '../../common/components/ui';
import { FROM_LIST_STATE } from '../../hooks';
import { switchDistributor } from '../../utils/switchDistributor';
import { activeDistributor } from '../../services/api/activeDistributor';
import { useDistributors } from '../../services/queries/distributors';
import { DistributorsTable } from './components/DistributorsTable';
import { useDistributorActions } from './useDistributorActions';

/**
 * Gestión de distribuidoras (empresas), sólo para el administrador general.
 * "Ver como" setea el header X-Distributor (localStorage) y recarga: así el
 * panel muestra sólo los datos de esa empresa. "Ver todas" vuelve a la vista global.
 */
export const Distributors = () => {
  const [viewingSlug, setViewingSlug] = useState(() => activeDistributor.get() ?? '');
  const { data: distributors, isLoading, isFetching, error, refetch } = useDistributors();
  const navigate = useNavigate();
  const { toggleStatus, remove } = useDistributorActions({ onViewingChanged: () => setViewingSlug('') });

  const viewAs = (slug: string) => {
    void switchDistributor(slug || null).then((switched) => {
      if (switched) setViewingSlug(slug);
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Distribuidoras"
        description="Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo."
        actions={
          <Button icon={<AddBusinessIcon />} onClick={() => navigate('/distributors/new')}>
            Nueva empresa
          </Button>
        }
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-ink">
          Viendo: <span className="font-semibold text-primary-strong">{viewingSlug || 'todas las empresas'}</span>
        </p>
        {viewingSlug && (
          <Button variant="secondary" size="sm" onClick={() => viewAs('')}>
            Ver todas
          </Button>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <TableSkeleton columns={4} />
        ) : error ? (
          <ErrorState error={error} resource="Las empresas" onRetry={() => void refetch()} />
        ) : (
          <DistributorsTable
            rows={distributors ?? []}
            loading={isFetching}
            viewingSlug={viewingSlug}
            onViewAs={(distributor) => viewAs(distributor.slug)}
            onView={(distributor) =>
              navigate(`/distributors/${distributor.distributor_id}`, { state: FROM_LIST_STATE })
            }
            onEdit={(distributor) => navigate(`/distributors/${distributor.distributor_id}/edit`)}
            onToggleStatus={(distributor) => void toggleStatus(distributor)}
            onDelete={(distributor) => void remove(distributor)}
          />
        )}
      </Card>
    </PageContainer>
  );
};
