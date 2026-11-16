import { useState } from 'react';
import { Cylinder, History, SlidersHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import { useCustomerContainers } from '../../../../services/queries/customerContainers';
import { ContainerAdjustModal } from './ContainerAdjustModal';
import { ContainerMovementsModal } from './ContainerMovementsModal';

/**
 * Los envases propios del cliente por tipo (F35 E2): cuántos tiene para canjear vacía por llena. Los que el recupero
 * (M5) tiene registrados en su poder se muestran aparte, sólo informativos. El admin los corrige con «Ajustar».
 */
export const CustomerContainersCard = ({ customerId }: { customerId: string }) => {
  const { operateHint } = usePermissions();
  const { data, isPending, error, refetch } = useCustomerContainers(customerId);
  const [adjusting, setAdjusting] = useState(false);
  const [history, setHistory] = useState(false);
  const accounts = data?.items ?? [];

  return (
    <Card>
      <CardHeader
        title="Envases"
        subtitle="Propios del cliente, por tipo de garrafa"
        className="border-b border-outline p-4"
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" icon={<History />} onClick={() => setHistory(true)}>
              Ver historial
            </Button>
            <Button
              size="sm"
              icon={<SlidersHorizontal />}
              blockedReason={
                operateHint ?? (accounts.length === 0 ? 'No hay tipos de garrafa para ajustar' : undefined)
              }
              onClick={() => setAdjusting(true)}
            >
              Ajustar
            </Button>
          </div>
        }
      />
      {isPending ? (
        <ListSkeleton rows={2} columns={3} />
      ) : error ? (
        <ErrorState error={error} resource="El cliente" onRetry={() => void refetch()} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Cylinder}
          title="Sin tipos de garrafa"
          description="No hay tipos de garrafa activos en el catálogo ni envases a nombre de este cliente."
        />
      ) : (
        <ul className="divide-y divide-outline-soft" aria-label="Envases por tipo">
          {accounts.map((a) => (
            <li key={a.gasCylinderId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-ink">{a.type}</span>
                {!a.isActive && <Badge label={{ text: 'Dado de baja', tone: 'neutral' }} />}
              </div>
              <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-xs text-muted">Propios</dt>
                  <dd className="tabular-nums font-semibold text-ink">{a.owned}</dd>
                </div>
                {a.loanedByM5 > 0 && (
                  <div
                    className="flex items-baseline gap-1.5"
                    title="Envases con número de serie que el recupero tiene en poder del cliente. Sólo informativo."
                  >
                    <dt className="text-xs text-muted">Prestados (recupero)</dt>
                    <dd className="tabular-nums text-ink-2">{a.loanedByM5}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <ContainerAdjustModal
        open={adjusting}
        onClose={() => setAdjusting(false)}
        customerId={customerId}
        accounts={accounts}
      />
      <ContainerMovementsModal open={history} onClose={() => setHistory(false)} customerId={customerId} />
    </Card>
  );
};
