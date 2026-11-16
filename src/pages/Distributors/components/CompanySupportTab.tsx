import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, EmptyState } from '../../../common/components/ui';
import type { CompanySupportSession } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { SUPPORT_SESSION_STATUS, labelOf } from '../../../utils/statusLabels';

const KIND: Record<CompanySupportSession['kind'], string> = {
  consented: 'Con aprobación',
  emergency: 'De emergencia',
};

const END_REASON: Record<NonNullable<CompanySupportSession['endReason']>, string> = {
  exit: 'Salió el administrador general',
  revoked_by_company: 'La revocó la empresa',
  revoked_by_platform: 'La revocó la plataforma',
  expired: 'Venció',
};

interface Props {
  distributorId: string;
  sessions: CompanySupportSession[];
}

/**
 * Las últimas 10 sesiones de soporte sobre la empresa: quién la pidió, por qué y cómo terminó. «Ver todas» lleva a
 * «Sesiones de soporte» filtrada por esta empresa.
 */
export const CompanySupportTab = ({ distributorId, sessions }: Props) => (
  <Card className="p-2 sm:p-4">
    <CardHeader
      title="Últimas sesiones"
      className="mb-2 px-2 pt-2"
      action={
        <Link
          to={`/platform/support-sessions?company=${encodeURIComponent(distributorId)}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver todas
        </Link>
      }
    />
    {sessions.length === 0 ? (
      <EmptyState title="Sin sesiones de soporte" description="Nadie de la plataforma pidió entrar a esta empresa." />
    ) : (
      <ul className="divide-y divide-outline">
        {sessions.map((session) => (
          <li key={session.id} className="grid gap-1 px-2 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">
                {session.requestedByName ?? 'Administrador general'} · {KIND[session.kind]}
              </p>
              <Badge label={labelOf(SUPPORT_SESSION_STATUS, session.status)} />
            </div>
            <p className="text-sm text-ink-2">{session.reason}</p>
            <p className="text-xs text-muted">
              Pedida el {formatDateTime(session.createdAt)} por {session.requestedMinutes} min
              {session.startedAt && ` · empezó el ${formatDateTime(session.startedAt)}`}
              {session.endedAt && ` · terminó el ${formatDateTime(session.endedAt)}`}
              {session.endReason && ` (${END_REASON[session.endReason]})`}
            </p>
          </li>
        ))}
      </ul>
    )}
  </Card>
);
