import { useMemo, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import type { Claim } from '../../services/api/types';
import { useClaims } from '../../services/queries/claims';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { ClaimStatusFilter } from './components/ClaimStatusFilter';
import { ClaimsTable } from './components/ClaimsTable';
import { CreateClaimModal } from './components/CreateClaimModal';

type StatusOrAll = Claim['status'] | 'all';

export const Claims = () => {
  const { data: claims, isLoading, isFetching, error, refetch } = useClaims();
  const [status, setStatus] = useState<StatusOrAll>('all');
  const [selected, setSelected] = useState<Claim | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => (claims ?? []).filter((c) => status === 'all' || c.status === status), [claims, status]);

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

      <Card>
        <div className="border-b border-outline p-4">
          <ClaimStatusFilter value={status} onChange={setStatus} />
        </div>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} resource="Los reclamos" onRetry={() => void refetch()} />
        ) : (
          <ClaimsTable rows={rows} loading={isFetching} onManage={setSelected} />
        )}
      </Card>

      <ClaimDetailModal open={selected !== null} onClose={() => setSelected(null)} claim={selected} />
      <CreateClaimModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
