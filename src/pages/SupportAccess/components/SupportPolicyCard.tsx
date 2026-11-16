import { Card, CardHeader, ErrorState, LoadingState, Switch } from '../../../common/components/ui';
import { useSupportPolicy, useUpdateSupportPolicy } from '../../../services/queries/supportSessions';
import { notify } from '../../../utils/notifications';

const NO_PERMISSION = 'Necesitás el permiso para gestionar los accesos de soporte';

/** La política de la empresa frente al soporte: emergencias permitidas y autoaprobación (D1). */
export const SupportPolicyCard = ({ canManage }: { canManage: boolean }) => {
  const { data, isPending, error, refetch } = useSupportPolicy();
  const update = useUpdateSupportPolicy();
  const change = (patch: { emergencyAllowed?: boolean; autoApprove?: boolean }, done: string) =>
    update.mutate(patch, { onSuccess: () => notify.success(done), onError: notify.error });

  return (
    <Card className="p-5">
      <CardHeader title="Política" subtitle="Cómo puede entrar el soporte a tu empresa" />
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="La política" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Permitir accesos de emergencia</p>
              <p className="text-xs text-muted">
                Entra sin esperar tu aprobación, con aviso inmediato y como máximo 60 minutos.
              </p>
            </div>
            <Switch
              checked={data.emergencyAllowed}
              label="Permitir accesos de emergencia"
              disabled={!canManage || update.isPending}
              title={canManage ? undefined : NO_PERMISSION}
              onChange={(value) =>
                change({ emergencyAllowed: value }, value ? 'Emergencias permitidas' : 'Emergencias deshabilitadas')
              }
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">Aprobar los pedidos automáticamente</p>
              <p className="text-xs text-muted">Cada pedido se abre tal como se pidió, sin que nadie lo apruebe.</p>
            </div>
            <Switch
              checked={data.autoApprove}
              label="Aprobar los pedidos automáticamente"
              disabled={!canManage || update.isPending}
              title={canManage ? undefined : NO_PERMISSION}
              onChange={(value) =>
                change({ autoApprove: value }, value ? 'Autoaprobación prendida' : 'Autoaprobación apagada')
              }
            />
          </div>
        </div>
      )}
    </Card>
  );
};
