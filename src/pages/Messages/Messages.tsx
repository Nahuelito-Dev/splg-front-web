import { ChartLine, Megaphone, MessageSquareText, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, cx, EmptyState, PageContainer, PageHeader } from '../../common/components/ui';
import { useCompanyDisplayName } from '../../common/components/useCompanyDisplayName';
import { BroadcastDriversModal } from '../../features/chat/inbox/BroadcastDriversModal';
import { reopensAt } from '../../features/chat/inbox/inboxLabels';
import { MESSAGES_METRICS_PATH, MESSAGES_SETTINGS_PATH } from '../../features/chat/routes';
import { useInboxAccess } from '../../features/chat/useInboxAccess';
import { useAppSelector } from '../../hooks/reduxHooks';
import { usePermiso } from '../../hooks/usePermiso';
import { useUrlParam } from '../../hooks/useUrlParam';
import { useChatSettings } from '../../services/queries/inbox';
import { useMyAccount } from '../../services/queries/users';
import { ConversationPanel } from './components/ConversationPanel';
import { InboxList } from './components/InboxList';
import { isInboxFilter, isInboxTab, type InboxFilter, type InboxTab } from './inboxTabs';

/** «En horario» / «Fuera de horario · vuelve…» y si el chat con los clientes está apagado. */
const HoursBadges = () => {
  const { data } = useChatSettings();
  if (!data) return null;
  return (
    <>
      <Badge
        label={
          data.openNow
            ? { text: 'En horario de atención', tone: 'success' }
            : { text: `Fuera de horario · ${reopensAt(data.nextOpenAt)}`, tone: 'warn' }
        }
      />
      {!data.customerChatEnabled && <Badge label={{ text: 'Chat con clientes apagado', tone: 'neutral' }} />}
    </>
  );
};

/**
 * «Mensajes» (§15.2): la bandeja de la empresa con sus clientes y sus choferes, en vivo. Tres columnas en pantallas
 * anchas (lista · hilo · contexto), dos en las medianas (el contexto en un cajón) y una por vez en el celular.
 */
export const Messages = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const access = useInboxAccess();
  const companyName = useCompanyDisplayName() ?? 'La empresa';
  const email = useAppSelector((state) => state.auth.email);
  const me = useMyAccount(email).data?.user_id;
  const [tabParam, setTab] = useUrlParam('tab', 'unassigned');
  const [filterParam, setFilter] = useUrlParam('canal', 'all');
  const [awaitingParam, setAwaiting] = useUrlParam('esperando', '');
  const tab: InboxTab = isInboxTab(tabParam) ? tabParam : 'unassigned';
  const filter: InboxFilter = isInboxFilter(filterParam) ? filterParam : 'all';
  const [broadcasting, setBroadcasting] = useState(false);
  const settings = useChatSettings();
  const supervise = usePermiso('mensajes.supervisar').allowed;

  if (!access.any) {
    return (
      <PageContainer>
        <PageHeader title="Mensajes" />
        <Card>
          <EmptyState
            icon={MessageSquareText}
            title="No tenés permiso para atender mensajes"
            description="Pedile a quien administra la empresa el permiso «Atender los mensajes de los clientes» o «de los choferes»."
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full" stack>
      <PageHeader
        title="Mensajes"
        description="Las conversaciones con tus clientes y tus choferes, en vivo. Tomá una para atenderla; el cliente siempre ve la marca de la empresa."
        badges={<HoursBadges />}
        actions={
          <>
            {access.drivers && (
              <Button variant="secondary" icon={<Megaphone />} onClick={() => setBroadcasting(true)}>
                Avisar a varios choferes
              </Button>
            )}
            {supervise && (
              <Button variant="secondary" icon={<ChartLine />} onClick={() => navigate(MESSAGES_METRICS_PATH)}>
                Métricas
              </Button>
            )}
            {access.configure && (
              <Button variant="secondary" icon={<Settings2 />} onClick={() => navigate(MESSAGES_SETTINGS_PATH)}>
                Configuración
              </Button>
            )}
          </>
        }
      />
      {settings.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          No se pudo leer el horario de atención. La bandeja sigue funcionando.
        </p>
      )}
      <div className="grid h-[calc(100dvh-220px)] min-h-[520px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className={cx('flex min-h-0 flex-col overflow-hidden p-0', id && 'hidden lg:flex')}>
          <InboxList
            tab={tab}
            onTab={setTab}
            filter={access.customers && access.drivers ? filter : 'all'}
            onFilter={setFilter}
            bothChannels={access.customers && access.drivers}
            awaitingOnly={awaitingParam === '1'}
            onAwaitingOnly={(only) => setAwaiting(only ? '1' : '')}
            selectedId={id}
          />
        </Card>
        <div className={cx('min-h-0 flex-col', id ? 'flex' : 'hidden lg:flex')}>
          {id ? (
            <ConversationPanel key={id} id={id} myUserId={me} companyName={companyName} access={access} />
          ) : (
            <Card className="grid flex-1 place-items-center">
              <EmptyState
                icon={MessageSquareText}
                title="Elegí una conversación"
                description="Las que esperan que alguien las tome están en «Sin asignar»."
              />
            </Card>
          )}
        </div>
      </div>
      <BroadcastDriversModal open={broadcasting} onClose={() => setBroadcasting(false)} />
    </PageContainer>
  );
};
