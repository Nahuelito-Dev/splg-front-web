import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { Button, Card, ErrorState, PageHeader, TableSkeleton, PageContainer } from '../../common/components/ui';
import { FROM_LIST_STATE } from '../../hooks';
import { activeDistributor } from '../../services/api/activeDistributor';
import type { Distributor } from '../../services/api/types';
import { useDistributors } from '../../services/queries/distributors';
import { DistributorFormModal } from './components/DistributorFormModal';
import { DistributorsTable } from './components/DistributorsTable';
import { useDistributorActions } from './useDistributorActions';

type FormState = { open: false } | { open: true; distributor: Distributor | null };

/**
 * Gestión de distribuidoras (empresas), sólo para el administrador general.
 * "Ver como" setea el header X-Distributor (localStorage) y recarga: así el
 * panel muestra sólo los datos de esa empresa. "Ver todas" vuelve a la vista global.
 */
export const Distributors = () => {
  const [viewingSlug, setViewingSlug] = useState(() => activeDistributor.get() ?? '');
  const [form, setForm] = useState<FormState>({ open: false });
  const { data: distributors, isLoading, isFetching, error, refetch } = useDistributors();
  const navigate = useNavigate();
  const { toggleStatus, remove } = useDistributorActions({ onViewingChanged: () => setViewingSlug('') });

  const viewAs = (slug: string) => {
    activeDistributor.set(slug || null);
    setViewingSlug(slug);
    window.location.reload();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Distribuidoras"
        description="Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo."
        actions={
          <Button icon={<AddBusinessIcon />} onClick={() => setForm({ open: true, distributor: null })}>
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
            onEdit={(distributor) => setForm({ open: true, distributor })}
            onToggleStatus={(distributor) => void toggleStatus(distributor)}
            onDelete={(distributor) => void remove(distributor)}
          />
        )}
      </Card>

      <DistributorFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        distributor={form.open ? form.distributor : null}
      />
    </PageContainer>
  );
};
