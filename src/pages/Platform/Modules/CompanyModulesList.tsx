import { useState } from 'react';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Skeleton, Switch } from '../../../common/components/ui';
import { usePlatformCompanyModules } from '../../../services/queries/modules';
import { formatDateTime } from '../../../utils/format';
import { ModuleChangeModal, type ModuleChange } from './ModuleChangeModal';
import { moduleSource, moduleUsage } from './moduleRules';

interface Props {
  companyId: string;
  companyName: string;
}

/**
 * Los módulos de una empresa para el administrador general (ficha → «Plan y módulos»): uno por fila, con lo que trae el
 * plan, la excepción vigente (motivo y vencimiento) y si la empresa lo usa. El interruptor es «habilitado» (plan o
 * excepción); cambiarlo pide confirmación con motivo. La lista sale entera de la API: un módulo nuevo del catálogo
 * aparece sin tocar el panel.
 */
export const CompanyModulesList = ({ companyId, companyName }: Props) => {
  const { data, isPending, error, refetch } = usePlatformCompanyModules(companyId);
  const [change, setChange] = useState<ModuleChange | null>(null);

  return (
    <Card className="p-2 sm:p-4">
      <CardHeader
        title="Módulos"
        subtitle="Lo que la plataforma le habilita a la empresa. Lo que no es un módulo es núcleo y no se apaga."
        className="mb-2 px-2 pt-2"
      />
      {error ? (
        <ErrorState error={error} resource="La empresa" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div role="status" aria-label="Cargando los módulos" className="space-y-3 p-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState title="Sin módulos" description="La API no devolvió ningún módulo para esta empresa." />
      ) : (
        <ul className="divide-y divide-outline">
          {data.map((module) => (
            <li key={module.key} className="flex items-start justify-between gap-3 px-2 py-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-medium text-ink">{module.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge label={moduleSource(module)} />
                  <Badge label={moduleUsage(module)} />
                </div>
                {module.override && (
                  <p className="break-words text-xs text-muted">
                    {module.override.reason}
                    {module.override.expiresAt && ` · vence el ${formatDateTime(module.override.expiresAt)}`}
                  </p>
                )}
              </div>
              <Switch
                checked={module.enabled}
                label={`${module.label} habilitado para ${companyName}`}
                onChange={(wantEnabled) => setChange({ companyId, companyName, module, wantEnabled })}
              />
            </li>
          ))}
        </ul>
      )}
      <ModuleChangeModal change={change} onClose={() => setChange(null)} />
    </Card>
  );
};
