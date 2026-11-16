import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { usePermissions } from '../../hooks';
import { useActiveSupportAccess, usePlatform } from '../../services/queries/supportSessions';
import { formatTime } from '../../utils/format';
import { useRevokeWithConfirm, useSupportAccessPermissions } from './useSupportAccessActions';
import { Button } from '../components/ui';

/**
 * Franja discreta en el panel del admin de la empresa mientras el soporte tiene acceso:
 * «El soporte de <plataforma> tiene acceso de lectura hasta las 15:42 · [Ver] [Revocar]».
 */
export const CompanySupportStrip = () => {
  const { mode } = usePermissions();
  const isCompany = mode === 'company';
  const { canView, canManage } = useSupportAccessPermissions();
  const { data } = useActiveSupportAccess(isCompany && canView);
  const { data: platform } = usePlatform();
  const revoke = useRevokeWithConfirm();
  const session = data?.rows[0];
  if (!isCompany || !session) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-warn/30 bg-warn-soft px-3 py-2 text-[13px] text-warn sm:px-6 lg:px-7"
    >
      <p className="min-w-0 flex-1 leading-snug">
        El soporte{platform ? ` de ${platform.name}` : ''} tiene acceso de lectura
        {session.expiresAt ? ` hasta las ${formatTime(session.expiresAt)}` : ''}
        {session.kind === 'emergency' ? ' (emergencia)' : ''}.
      </p>
      <Link
        to={`/support-access?session=${encodeURIComponent(session.id)}`}
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
      >
        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
        Ver
      </Link>
      {canManage && (
        <Button size="sm" variant="secondary" loading={revoke.isPending} onClick={() => void revoke.run(session)}>
          Revocar
        </Button>
      )}
    </div>
  );
};
