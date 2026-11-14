import { useState } from 'react';
import { Badge, DetailList, Drawer, EmptyState, ErrorState, LoadingState, Button } from '../../../common/components/ui';
import type { SupportSession } from '../../../services/api/types';
import { useSupportAccessEntries } from '../../../services/queries/supportSessions';
import { formatDateTime, formatNumber } from '../../../utils/format';
import { labelOf, SUPPORT_SCOPE, SUPPORT_SESSION_STATUS } from '../../../utils/statusLabels';

const ACCESS_PAGE_SIZE = 20;

const END_REASON: Record<NonNullable<SupportSession['endReason']>, string> = {
  exit: 'El soporte salió',
  revoked_by_company: 'La revocó la empresa',
  revoked_by_platform: 'La cortó la plataforma',
  expired: 'Venció',
};

/** Qué miró el soporte en esa sesión: cada consulta que hizo, la más nueva primero. */
const Accesses = ({ id }: { id: string }) => {
  const [page, setPage] = useState(0);
  const { data, isPending, error, refetch } = useSupportAccessEntries(id, { page, pageSize: ACCESS_PAGE_SIZE });
  if (isPending) return <LoadingState label="Cargando lo que miró…" />;
  if (error) return <ErrorState error={error} resource="El registro" onRetry={() => void refetch()} />;
  if (!data || data.rows.length === 0) {
    return (
      <EmptyState title="Sin consultas registradas" description="El soporte todavía no miró nada en esta sesión." />
    );
  }
  const pages = Math.max(1, Math.ceil(data.total / ACCESS_PAGE_SIZE));
  return (
    <div className="grid gap-2">
      <ul className="divide-y divide-outline rounded-lg border border-outline">
        {data.rows.map((entry) => (
          <li key={entry.id} className="grid gap-0.5 px-3 py-2 text-sm">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-ink">
                {entry.httpMethod} {entry.path}
              </span>
              <span className="text-xs text-muted">{formatDateTime(entry.at)}</span>
            </span>
            <span className="text-xs text-muted">
              {entry.resource ?? 'Consulta'} · respuesta {entry.statusCode}
              {entry.items !== null ? ` · ${formatNumber(entry.items)} registros` : ''}
              {entry.masked ? ' · con datos ocultos' : ''}
            </span>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span>
            Página {page + 1} de {pages}
          </span>
          <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};

interface Props {
  session: SupportSession | null;
  onClose: () => void;
}

/** El detalle de un pedido o sesión de soporte: motivo, alcance, quién decidió, cuándo terminó y qué miró. */
export const SupportSessionDrawer = ({ session, onClose }: Props) => (
  <Drawer
    open={session !== null}
    onClose={onClose}
    size="lg"
    title="Acceso de soporte"
    description={session ? `Pedido por ${session.requestedBy.fullName ?? 'el soporte'}` : undefined}
  >
    {session && (
      <div className="grid gap-5">
        <div className="flex flex-wrap gap-2">
          <Badge label={labelOf(SUPPORT_SESSION_STATUS, session.status)} />
          {session.kind === 'emergency' && <Badge label={{ text: 'Emergencia', tone: 'danger' }} />}
        </div>
        <DetailList
          items={[
            { label: 'Motivo', value: session.reason, wide: true },
            { label: 'Referencia', value: session.ticketRef ?? '—', mono: true },
            { label: 'Duración pedida', value: `${session.requestedMinutes} minutos` },
            {
              label: 'Alcance',
              value:
                session.scope.length === 0
                  ? 'Sólo lo básico'
                  : session.scope.map((s) => labelOf(SUPPORT_SCOPE, s).text).join(', '),
              wide: true,
            },
            { label: 'Pedido', value: formatDateTime(session.createdAt) },
            {
              label: 'Decisión',
              value: session.decidedAt
                ? `${formatDateTime(session.decidedAt)}${session.decidedBy?.fullName ? ` · ${session.decidedBy.fullName}` : ''}`
                : '—',
            },
            { label: 'Nota de la decisión', value: session.decisionNote ?? '—', wide: true },
            { label: 'Desde', value: formatDateTime(session.startedAt) },
            { label: 'Hasta', value: formatDateTime(session.endedAt ?? session.expiresAt) },
            {
              label: 'Cómo terminó',
              value: session.endReason
                ? `${END_REASON[session.endReason]}${session.endedBy?.fullName ? ` (${session.endedBy.fullName})` : ''}`
                : '—',
            },
          ]}
        />
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-ink">Qué miró</h3>
          <Accesses id={session.id} />
        </section>
      </div>
    )}
  </Drawer>
);
