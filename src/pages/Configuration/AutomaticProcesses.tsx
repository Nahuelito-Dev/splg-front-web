import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  PageContainer,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useProcessConfigs } from '../../services/queries/moduleConfig';
import { formatDateTime } from '../../utils/format';
import { DistributorRequired } from './components/DistributorRequired';
import { ProcessConfigModal } from './components/ProcessConfigModal';

/** Los cinco procesos automáticos configurables por distribuidora, con sus parámetros vigentes (CU-172). */
export const AutomaticProcesses = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useProcessConfigs({ enabled: !needsDistributor });
  const [editing, setEditing] = useState<string | null>(null);
  // Se busca en la lista vigente: al guardar, la lista se actualiza sola y el modal se cierra.
  const config = data?.find((p) => p.process === editing);

  return (
    <PageContainer size="md">
      <PageHeader
        title="Procesos automáticos"
        description="Los parámetros de los procesos que el sistema ejecuta solo: plazos, umbrales, vigencias y horarios de cada uno."
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : error ? (
        <ErrorState error={error} resource="Los procesos automáticos" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length === 0 ? (
        <EmptyState title="No hay procesos configurables" description="La API no devolvió ningún proceso." />
      ) : (
        <ul className="space-y-4">
          {data.map((process) => (
            <li key={process.process}>
              <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">{process.title}</h2>
                    <Badge
                      label={
                        process.isDefault
                          ? { text: 'Valores por defecto', tone: 'info' }
                          : { text: 'Configurado', tone: 'success' }
                      }
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted">{process.description}</p>
                  {process.updatedAt && (
                    <p className="mt-2 text-[13px] text-muted">Modificado el {formatDateTime(process.updatedAt)}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
                  aria-label={`${canWrite ? 'Configurar' : 'Ver'} ${process.title}`}
                  onClick={() => setEditing(process.process)}
                >
                  {canWrite ? 'Configurar' : 'Ver parámetros'}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {config && (
        <ProcessConfigModal
          key={`${config.process}|${config.updatedAt ?? 'none'}`}
          config={config}
          canWrite={canWrite}
          writeHint={writeHint}
          onClose={() => setEditing(null)}
        />
      )}
    </PageContainer>
  );
};
