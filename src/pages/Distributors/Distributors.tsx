import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { Button, Card, ErrorState, PageHeader, TableSkeleton, PageContainer } from '../../common/components/ui';
import { FROM_LIST_STATE } from '../../hooks';
import { RequestSupportModal } from '../../common/support/RequestSupportModal';
import { useDistributors } from '../../services/queries/distributors';
import { DistributorsTable } from './components/DistributorsTable';
import { useDistributorActions } from './useDistributorActions';

/**
 * Gestión de distribuidoras (empresas), sólo para el administrador general en la plataforma. Para ver los datos de
 * una empresa se pide acceso de soporte (la empresa lo aprueba, es sólo lectura y vence solo).
 */
export const Distributors = () => {
  const [supportFor, setSupportFor] = useState<string | null>(null);
  const { data: distributors, isLoading, isFetching, error, refetch } = useDistributors();
  const navigate = useNavigate();
  const { toggleStatus, remove } = useDistributorActions();

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

      <Card>
        {isLoading ? (
          <TableSkeleton columns={4} />
        ) : error ? (
          <ErrorState error={error} resource="Las empresas" onRetry={() => void refetch()} />
        ) : (
          <DistributorsTable
            rows={distributors ?? []}
            loading={isFetching}
            onRequestSupport={(distributor) => setSupportFor(distributor.distributor_id)}
            onView={(distributor) =>
              navigate(`/distributors/${distributor.distributor_id}`, { state: FROM_LIST_STATE })
            }
            onEdit={(distributor) => navigate(`/distributors/${distributor.distributor_id}/edit`)}
            onToggleStatus={(distributor) => void toggleStatus(distributor)}
            onDelete={(distributor) => void remove(distributor)}
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
