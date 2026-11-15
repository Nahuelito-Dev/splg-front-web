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
  CardHeader,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useProcessConfigs } from '../../services/queries/moduleConfig';
import { isModuleOff, useModuleAvailability } from '../../services/queries/modules';
import { formatDateTime } from '../../utils/format';
import { DistributorRequired } from './components/DistributorRequired';
import { ProcessConfigModal } from './components/ProcessConfigModal';

/**
 * Los procesos automáticos configurables por distribuidora, con sus parámetros vigentes (CU-172). Cada proceso es el
 * de un módulo con su misma clave: los de un módulo que la plataforma no le habilitó a la empresa no se muestran (la
 * API respondería 403 `MODULE_DISABLED` al abrirlos).
 */
export const AutomaticProcesses = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data: all, isPending: configsPending, error, refetch } = useProcessConfigs({ enabled: !needsDistributor });
  const { enabledByKey, loading: modulesPending } = useModuleAvailability();
  const isPending = configsPending || modulesPending;
  const data = all?.filter((p) => !isModuleOff(enabledByKey, p.process));
  const hiddenCount = (all?.length ?? 0) - (data?.length ?? 0);
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
      ) : isPending || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : data.length === 0 ? (
        hiddenCount > 0 ? (
          <EmptyState
            title="No hay procesos para configurar"
            description="Los procesos automáticos son de módulos que no están incluidos en el plan de tu empresa."
          />
        ) : (
          <EmptyState title="No hay procesos configurables" description="La API no devolvió ningún proceso." />
        )
      ) : (
        <ul className="space-y-4">
          {data.map((process) => (
            <li key={process.process}>
              <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardHeader
                    title={process.title}
                    subtitle={process.description}
                    className=""
                    badge={
                      <Badge
                        label={
                          process.isDefault
                            ? { text: 'Valores por defecto', tone: 'info' }
                            : { text: 'Configurado', tone: 'success' }
                        }
                      />
                    }
                  />
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
