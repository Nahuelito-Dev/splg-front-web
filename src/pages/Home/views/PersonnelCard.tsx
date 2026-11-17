import type { LucideIcon } from 'lucide-react';
import { CalendarOff, FileWarning, FileClock, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { usePersonnelDashboard } from '../../../services/queries/personnel';
import { formatNumber } from '../../../utils/format';

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

/** «Personal hoy» (CU-194): presentes, de licencia y documentación por estado. Cuenta; el detalle está en cada pantalla. */
export const PersonnelCard = () => {
  const { needsDistributor } = usePermissions();
  const { data, isPending, error } = usePersonnelDashboard(!needsDistributor);
  if (needsDistributor) return null;

  return (
    <Card className="divide-y divide-outline-soft overflow-hidden">
      <div className="px-[18px] py-3.5">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Personal hoy</h2>
        <p className="text-xs text-muted">
          {data ? `${formatNumber(data.totalActive)} empleados activos` : 'Presencia, licencias y documentación.'}
        </p>
      </div>
      {isPending && !error ? (
        <div className="m-[18px] h-32 animate-pulse rounded-lg bg-surface-hover" />
      ) : error || !data ? (
        <p role="alert" className="px-[18px] py-4 text-sm text-danger">
          No se pudo cargar el personal.
        </p>
      ) : (
        <>
          <Row
            icon={UserCheck}
            label="Presentes"
            detail="Con una jornada abierta"
            value={formatNumber(data.presentToday)}
            to="/attendance"
          />
          <Row
            icon={CalendarOff}
            label="De licencia"
            detail="Con una licencia aprobada que cubre hoy"
            value={formatNumber(data.onLeaveToday)}
            to="/leaves?status=approved"
          />
          <Row
            icon={FileWarning}
            label="Documentos vencidos"
            detail="Del personal y la licencia de los choferes"
            value={formatNumber(data.documents.expired)}
            to="/fleet/expirations?subject=employee"
            alert={data.documents.expired > 0}
          />
          <Row
            icon={FileClock}
            label="Documentos por vencer"
            detail={`${formatNumber(data.documents.current)} vigentes`}
            value={formatNumber(data.documents.dueSoon)}
            to="/fleet/expirations?subject=employee"
          />
        </>
      )}
    </Card>
  );
};
