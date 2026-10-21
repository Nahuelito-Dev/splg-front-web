import { useState } from 'react';
import { BookOpen, Lock, LockOpen, Wallet } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  ErrorState,
  KpiCard,
  PageHeader,
  PageContainer,
  CardHeader,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { CashBox } from '../../services/api/types';
import { useCashBox, useCashSession } from '../../services/queries/finance';
import { useUserNames } from '../../services/queries/userNames';
import { formatCurrencyExact, formatDateTime, formatShortId } from '../../utils/format';
import { CASH_BOX_KIND, labelOf } from '../../utils/statusLabels';
import { CashSessionsCard } from './components/CashSessionsCard';
import { CloseSessionModal } from './components/CloseSessionModal';
import { OpenSessionModal } from './components/OpenSessionModal';

const stateBadge = (box: CashBox) =>
  !box.isActive ? (
    <Badge label={{ text: 'Desactivada', tone: 'neutral' }} />
  ) : box.requiresSession ? (
    <Badge label={box.openSessionId ? { text: 'Abierta', tone: 'success' } : { text: 'Cerrada', tone: 'warn' }} />
  ) : (
    <Badge label={{ text: 'Sin sesión', tone: 'neutral' }} />
  );

/** La sesión en curso de una caja abierta: desde cuándo, con cuánto y quién la abrió. */
const OpenSessionCard = ({ sessionId }: { sessionId: string }) => {
  const { data: session } = useCashSession(sessionId);
  const names = useUserNames([session?.openedByUserId]);
  if (!session) return null;
  return (
    <Card className="p-5">
      <CardHeader title="Sesión en curso" />
      <DetailList
        className="sm:grid-cols-1"
        items={[
          { label: 'Abierta', value: formatDateTime(session.openedAt) },
          {
            label: 'Abrió',
            value: names.nameOf(session.openedByUserId) ?? formatShortId(session.openedByUserId),
          },
          { label: 'Monto inicial', value: formatCurrencyExact(session.openingAmount), mono: true },
          { label: 'Saldo esperado', value: formatCurrencyExact(session.currentBalance), mono: true },
        ]}
      />
    </Card>
  );
};

/** La ficha de una caja: sus datos, la sesión en curso y el historial de aperturas y cierres con arqueo (CU-225, 226, 227). */
export const CashBoxDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/finance/boxes');
  const { canWrite, writeHint } = usePermissions();
  const { data: box, isPending, error, refetch } = useCashBox(id);
  useCrumbLeaf(box?.name, goBack);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  const canOperate = Boolean(box?.isActive && box.requiresSession);

  return (
    <PageContainer>
      {isPending ? (
        <DetailSkeleton />
      ) : error || !box ? (
        <>
          <PageHeader title="Caja" />
          <ErrorState error={error} resource="La caja" onRetry={() => void refetch()} />
        </>
      ) : (
        <>
          <PageHeader
            title={box.name}
            eyebrow={labelOf(CASH_BOX_KIND, box.kind).text}
            badges={stateBadge(box)}
            actions={
              <>
                <Link
                  to={`/finance/movements?cashBoxId=${box.cashBoxId}`}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-outline bg-surface px-4 text-[13px] font-medium text-ink hover:bg-surface-hover"
                >
                  <BookOpen aria-hidden="true" className="h-4 w-4" /> Ver movimientos
                </Link>
                {canOperate &&
                  (box.openSessionId ? (
                    <Button icon={<Lock />} disabled={!canWrite} title={writeHint} onClick={() => setClosing(true)}>
                      Cerrar con arqueo
                    </Button>
                  ) : (
                    <Button icon={<LockOpen />} disabled={!canWrite} title={writeHint} onClick={() => setOpening(true)}>
                      Abrir caja
                    </Button>
                  ))}
              </>
            }
          />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 space-y-5 lg:col-span-2">
              <KpiCard title="Saldo según el libro" icon={Wallet} value={formatCurrencyExact(box.balance)} />
              <CashSessionsCard cashBoxId={box.cashBoxId} />
            </div>
            <div className="min-w-0 space-y-5 lg:col-span-1">
              <Card className="p-5">
                <CardHeader title="Datos" />
                <DetailList
                  className="sm:grid-cols-1"
                  items={[
                    { label: 'Tipo', value: labelOf(CASH_BOX_KIND, box.kind).text },
                    { label: 'Estado', value: stateBadge(box) },
                    { label: 'Exige abrir y cerrar sesión', value: box.requiresSession ? 'Sí' : 'No' },
                    { label: 'Creada', value: formatDateTime(box.createdAt) },
                    { label: 'Última modificación', value: formatDateTime(box.updatedAt) },
                  ]}
                />
              </Card>
              {box.openSessionId && <OpenSessionCard sessionId={box.openSessionId} />}
            </div>
          </div>
          <OpenSessionModal open={opening} onClose={() => setOpening(false)} cashBox={box} />
          <CloseSessionModal open={closing} onClose={() => setClosing(false)} sessionId={box.openSessionId} />
        </>
      )}
    </PageContainer>
  );
};
