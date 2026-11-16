import type { LucideIcon } from 'lucide-react';
import { HardHat, MessageSquareWarning, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../common/components/ui';
import { useCars } from '../../../services/queries/cars';
import { useClaims } from '../../../services/queries/claims';
import { useDeliveries } from '../../../services/queries/deliveries';
import { formatNumber } from '../../../utils/format';

/** Sólo hacen falta los totales (X-Total-Count): una fila por consulta. */
const ONE_ROW = { page: 0, pageSize: 1 };

interface RowProps {
  icon: LucideIcon;
  label: string;
  detail: string;
  value: string;
  to: string;
  alert?: boolean;
}

const Row = ({ icon: Icon, label, detail, value, to, alert = false }: RowProps) => (
  <Link
    to={to}
    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-[18px] py-3 transition-colors hover:bg-surface-sunken"
  >
    <span className="grid h-8 w-8 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2">
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
    </span>
    <span className="min-w-0">
      <b className="block text-[13px] font-semibold text-ink">{label}</b>
      <span className="block truncate text-[11.5px] text-muted">{detail}</span>
    </span>
    <b className={alert ? 'tabular-nums text-[15px] text-danger' : 'tabular-nums text-[15px] text-ink'}>{value}</b>
  </Link>
);

/**
 * Flota y posventa. "En línea" es lo que la API llama activo: habilitado por
 * el admin, validado y conectado en su app, o sea, listo para recibir pedidos.
 */
export const OperationCard = () => {
  const { data: allDrivers } = useDeliveries(ONE_ROW, '', 'all');
  const { data: onlineDrivers } = useDeliveries(ONE_ROW, '', 'online');
  const { data: cars = [] } = useCars();
  const { data: claims = [] } = useClaims({ refetchInterval: 30_000 });
  const pendingClaims = claims.filter((claim) => claim.status === 'pending').length;

  return (
    <Card className="divide-y divide-outline-soft overflow-hidden">
      <div className="px-[18px] py-3.5">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Flota y posventa</h2>
        <p className="text-xs text-muted">Choferes, vehículos y reclamos por atender.</p>
      </div>
      <Row
        icon={HardHat}
        label="Choferes en línea"
        detail={`de ${formatNumber(allDrivers?.total ?? 0)} registrados`}
        value={formatNumber(onlineDrivers?.total ?? 0)}
        to="/deliveries"
      />
      <Row
        icon={Truck}
        label="Vehículos"
        detail="La flota de la distribuidora"
        value={formatNumber(cars.length)}
        to="/cars"
      />
      <Row
        icon={MessageSquareWarning}
        label="Reclamos pendientes"
        detail={pendingClaims ? 'Esperan respuesta' : 'Nada pendiente'}
        value={formatNumber(pendingClaims)}
        to="/claims"
        alert={pendingClaims > 0}
      />
    </Card>
  );
};
