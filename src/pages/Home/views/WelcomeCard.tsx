import { ClipboardList, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../../common/components/ui';
import { useAppSelector, usePermissions } from '../../../hooks';
import { useOrderStats } from '../../../services/queries/stats';
import { formatLongDay, formatNumber } from '../../../utils/format';
import { greetingFor } from '../lib/dashboard';

/** Saludo, el resumen del momento y los dos accesos que más se usan. */
export const WelcomeCard = () => {
  const navigate = useNavigate();
  const fullName = useAppSelector((state) => state.auth.fullName);
  const { canWrite, writeHint } = usePermissions();
  const { data: stats } = useOrderStats();
  const now = new Date();
  const firstName = fullName?.split(' ')[0];
  const pending = stats?.ordersSummary.pending;

  return (
    <Card className="flex flex-col gap-5 bg-gradient-to-br from-primary-soft to-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium text-muted">{formatLongDay(now)}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[26px]">
          {firstName ? `${greetingFor(now)}, ${firstName}` : greetingFor(now)}
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-muted">
          {pending === undefined
            ? 'Acá tenés el pulso de la operación de hoy.'
            : pending > 0
              ? `Hay ${formatNumber(pending)} ${pending === 1 ? 'pedido esperando' : 'pedidos esperando'} chofer.`
              : 'Todos los pedidos tienen chofer asignado.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          icon={<PhoneCall aria-hidden="true" />}
          disabled={!canWrite}
          title={writeHint}
          onClick={() => navigate('/orders/new')}
        >
          Nuevo pedido telefónico
        </Button>
        <Button variant="secondary" icon={<ClipboardList aria-hidden="true" />} onClick={() => navigate('/tracking')}>
          Pedidos sin chofer
        </Button>
      </div>
    </Card>
  );
};
