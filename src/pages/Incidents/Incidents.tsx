import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import type { Incident } from '../../services/api/types';
import { useIncidents } from '../../services/queries/incidents';
import { CreateIncidentModal } from './components/CreateIncidentModal';
import { IncidentsTable } from './components/IncidentsTable';
import { IncidentDetailModal } from './components/IncidentDetailModal';

export const Incidents = () => {
  const { data: incidents, isLoading, isFetching, error, refetch } = useIncidents();
  const [selected, setSelected] = useState<Incident | null>(null);
  const [creating, setCreating] = useState(false);
  const openCount = incidents?.filter((incident) => incident.status === 'open').length ?? 0;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Incidencias de reparto"
        description={`Problemas reportados por los choferes durante la entrega${openCount > 0 ? ` · ${openCount} abierta${openCount === 1 ? '' : 's'}` : ''}.`}
        actions={
          <Button icon={<TriangleAlert />} onClick={() => setCreating(true)}>
            Registrar incidencia
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} resource="Las incidencias" onRetry={() => void refetch()} />
        ) : (
          <IncidentsTable rows={incidents ?? []} loading={isFetching} onView={setSelected} />
        )}
      </Card>

      <IncidentDetailModal open={selected !== null} onClose={() => setSelected(null)} incident={selected} />
      <CreateIncidentModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
