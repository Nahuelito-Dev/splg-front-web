import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import type { Claim } from '../../services/api/types';
import { useClaims } from '../../services/queries/claims';
import { ClaimsTable } from './components/ClaimsTable';
import { CreateClaimModal } from './components/CreateClaimModal';
import { ResolveClaimModal } from './components/ResolveClaimModal';

export const Claims = () => {
  const { data: claims, isLoading, isFetching, error, refetch } = useClaims();
  const [selected, setSelected] = useState<Claim | null>(null);
  const [creating, setCreating] = useState(false);

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
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} resource="Los reclamos" onRetry={() => void refetch()} />
        ) : (
          <ClaimsTable rows={claims ?? []} loading={isFetching} onManage={setSelected} />
        )}
      </Card>

      <ResolveClaimModal open={selected !== null} onClose={() => setSelected(null)} claim={selected} />
      <CreateClaimModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
