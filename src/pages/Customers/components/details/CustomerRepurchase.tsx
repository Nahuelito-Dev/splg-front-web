import { Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, DetailList, EmptyState, ErrorState, ListSkeleton } from '../../../../common/components/ui';
import { toApiError } from '../../../../services/api/errors';
import type { RepurchaseCustomerForecast } from '../../../../services/api/types';
import { formatDate, formatNumber } from '../../../../utils/format';
import {
  daysLeftText,
  ESTIMATE_SOURCE,
  NO_FORECAST_REASON,
  noticeScheduleText,
  OFFSET_HELP,
  offsetText,
} from '../../Repurchase/repurchaseLabels';

interface Props {
  /** Administrador general sin «Ver como»: la estimación es de una distribuidora. */
  needsDistributor: boolean;
  /** La cuenta está bloqueada o dada de baja: no se la proyecta ni se la invita. */
  inactive?: 'blocked' | 'removed' | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  data: RepurchaseCustomerForecast | undefined;
}

/**
 * Pestaña «Recompra» de la ficha del cliente: cuándo se estima que se le acaba el gas con esta distribuidora y con
 * qué se estimó (sus compras o el consumo que declaró), más su aviso (CU-145) y la invitación abierta (CU-106).
 */
const INACTIVE_TEXT = {
  blocked: 'La cuenta está bloqueada: mientras siga así no se proyecta su recompra ni se le manda ninguna invitación.',
  removed: 'El cliente está dado de baja: no se proyecta su recompra ni se le manda ninguna invitación.',
} as const;

export const CustomerRepurchase = ({ needsDistributor, inactive = null, loading, error, onRetry, data }: Props) => {
  if (inactive) {
    return (
      <Card>
        <EmptyState icon={Repeat} title="Sin recompra estimada" description={INACTIVE_TEXT[inactive]} />
      </Card>
    );
  }
  if (needsDistributor) {
    return (
      <Card>
        <EmptyState
          icon={Repeat}
          title="Elegí una distribuidora"
          description="La fecha estimada de recompra es de cada distribuidora: elegí una con «Ver como» para verla."
        />
      </Card>
    );
  }
  if (loading) return <ListSkeleton />;
  // 404: el back no lo tiene como cliente de esta distribuidora (nunca le compró, o se lo dio de baja o bloqueó).
  if (error && toApiError(error).notFound) {
    return (
      <Card>
        <EmptyState
          icon={Repeat}
          title="Sin recompra estimada"
          description="Este cliente no figura entre los clientes activos de esta distribuidora: no se proyecta su recompra."
        />
      </Card>
    );
  }
  if (error || !data) return <ErrorState error={error} resource="La recompra estimada" onRetry={onRetry} />;

  const { forecast, reason } = data;
  if (!forecast) {
    return (
      <Card>
        <EmptyState
          icon={Repeat}
          title="Sin fecha estimada"
          description={reason ? NO_FORECAST_REASON[reason] : 'No hay con qué estimar la recompra de este cliente.'}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-ink">Se le acaba el gas el {formatDate(forecast.estimatedAt)}</h3>
        <Badge
          label={
            forecast.daysLeft < 0
              ? { text: 'Atrasado', tone: 'warn' }
              : { text: daysLeftText(forecast.daysLeft), tone: 'info' }
          }
        />
        {forecast.openInvitation && <Badge label={{ text: 'Invitación abierta', tone: 'info' }} />}
      </div>
      <DetailList
        className="mt-5 border-t border-outline pt-5"
        items={[
          { label: 'Se estimó con', value: ESTIMATE_SOURCE[forecast.source] },
          { label: 'Compras que entraron', value: String(forecast.ordersUsed) },
          {
            label: 'Última compra',
            value: `${formatDate(forecast.lastPurchaseAt)} · ${formatNumber(forecast.lastPurchaseKg)} kg`,
          },
          {
            label: 'Consumo declarado',
            value:
              forecast.declaredKgPerMonth == null
                ? 'Sin declarar'
                : `${formatNumber(forecast.declaredKgPerMonth)} kg por mes`,
          },
          { label: 'Consumo estimado', value: `${formatNumber(forecast.estimatedKgPerMonth)} kg por mes` },
          {
            label: 'Aviso previo',
            value: forecast.noticeEnabled ? `${forecast.noticeDays} días antes` : 'Desactivado por el cliente',
          },
          { label: 'Ajuste de su fecha', value: offsetText(forecast.offsetDays) ?? 'Sin ajuste' },
          ...(noticeScheduleText(forecast)
            ? [{ label: 'Aviso de la invitación', value: noticeScheduleText(forecast) }]
            : []),
        ]}
      />
      <p className="mt-4 text-[13px] text-muted">
        La estimación sale sólo de las compras de esta distribuidora. {OFFSET_HELP}{' '}
        <Link className="font-semibold text-primary-strong hover:underline" to="/customers/repurchase?tab=invitations">
          Ver las invitaciones
        </Link>
      </p>
    </Card>
  );
};
