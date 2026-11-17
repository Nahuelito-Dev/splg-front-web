import { MessageSquareText, Settings2, UsersRound } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { agentPresence } from '../../features/chat/assignment/presence';
import { MESSAGES_PATH, MESSAGES_SETTINGS_PATH } from '../../features/chat/routes';
import { useChatTeamEvents } from '../../features/chat/useChatTeamEvents';
import { useInboxAccess } from '../../features/chat/useInboxAccess';
import { useAppSelector } from '../../hooks/reduxHooks';
import { useMinuteClock } from '../../hooks/useMinuteClock';
import { usePermiso } from '../../hooks/usePermiso';
import { usePermissions } from '../../hooks/usePermissions';
import type { ChatAgent } from '../../services/api/types';
import { useChatAgents } from '../../services/queries/chatAssignment';
import { useChatSettings } from '../../services/queries/inbox';
import { useMyAccount } from '../../services/queries/users';
import { AgentLimitModal } from './team/AgentLimitModal';
import { TeamTable } from './team/TeamTable';

const SETTINGS_POLL_MS = 60_000;

const Header = ({ inbox, configure, summary }: { inbox: boolean; configure: boolean; summary?: string }) => {
  const navigate = useNavigate();
  return (
    <PageHeader
      title="Equipo de mensajes"
      description="Quién del equipo está en línea para recibir conversaciones, cuántas tiene abiertas y su tope para la asignación automática."
      badges={summary ? <Badge label={{ text: summary, tone: 'success' }} /> : undefined}
      actions={
        <>
          {configure && (
            <Button variant="secondary" icon={<Settings2 />} onClick={() => navigate(MESSAGES_SETTINGS_PATH)}>
              Configuración
            </Button>
          )}
          {inbox && (
            <Button variant="secondary" icon={<MessageSquareText />} onClick={() => navigate(MESSAGES_PATH)}>
              Ir a la bandeja
            </Button>
          )}
        </>
      }
    />
  );
};

/**
 * «Mensajes → Equipo» (8b): las personas que atienden algún canal con su estado (en línea, ausente, desconectada,
 * fuera de horario), sus canales, abiertas sobre el tope y la última asignación; quien configura los mensajes le cambia
 * el tope a cada una. Se pone al día con `chat:team` y, de respaldo, cada 30 s (quien sólo supervisa no está en las
 * salas de la bandeja).
 */
export const MessagesTeam = () => {
  const supervise = usePermiso('mensajes.supervisar');
  const configure = usePermiso('mensajes.configurar');
  // `GET /chat/settings` pide atender algún canal o configurar: quien sólo supervisa no lo lee (sin horario ni aviso).
  const customers = usePermiso('mensajes.clientes');
  const drivers = usePermiso('mensajes.choferes');
  const { canWrite } = usePermissions();
  const { any: inbox } = useInboxAccess();
  const allowed = supervise.allowed || configure.allowed;
  const agents = useChatAgents(allowed);
  const canReadSettings = configure.allowed || customers.allowed || drivers.allowed;
  // El horario (`openNow`) cambia solo: se relee cada minuto mientras la pantalla está abierta.
  const settings = useChatSettings(allowed && canReadSettings, SETTINGS_POLL_MS);
  const email = useAppSelector((state) => state.auth.email);
  const me = useMyAccount(email).data?.user_id;
  useChatTeamEvents(me, allowed);
  const now = useMinuteClock();
  const [editing, setEditing] = useState<ChatAgent | null>(null);
  const canEdit = configure.allowed && canWrite;
  const onEdit = useCallback((agent: ChatAgent) => setEditing(agent), []);

  if (!supervise.known && !configure.known) {
    return (
      <PageContainer>
        <Header inbox={inbox} configure={false} />
        <LoadingState label="Cargando el equipo…" />
      </PageContainer>
    );
  }
  if (!allowed) {
    return (
      <PageContainer>
        <Header inbox={inbox} configure={false} />
        <Card>
          <EmptyState
            icon={UsersRound}
            title="No tenés permiso para ver el equipo de mensajes"
            description="Hace falta el permiso «Supervisar los mensajes» o «Configurar los mensajes»."
          />
        </Card>
      </PageContainer>
    );
  }

  const openNow = settings.data?.openNow;
  const items = agents.data?.items ?? [];
  const online = items.filter((agent) => agentPresence(agent, openNow) === 'online').length;
  const summary = agents.data && items.length ? `${online} de ${items.length} en línea` : undefined;

  return (
    <PageContainer stack>
      <Header inbox={inbox} configure={configure.allowed} summary={summary} />
      {settings.data && !settings.data.autoAssignEnabled && (
        <p role="note" className="rounded-lg border border-outline bg-surface-sunken px-3 py-2 text-sm text-ink-2">
          La asignación automática está apagada: las conversaciones se toman o se asignan a mano.
          {configure.allowed && ' Se prende en la configuración de los mensajes.'}
        </p>
      )}
      <Card className="p-0">
        {agents.error && !agents.data ? (
          <ErrorState error={agents.error} resource="El equipo" onRetry={() => void agents.refetch()} />
        ) : (
          <TeamTable
            agents={items}
            openNow={openNow}
            now={now}
            loading={agents.isPending}
            onEdit={canEdit ? onEdit : undefined}
          />
        )}
      </Card>
      <AgentLimitModal
        agent={editing}
        companyMaxOpen={settings.data?.autoAssignMaxOpen}
        onClose={() => setEditing(null)}
      />
    </PageContainer>
  );
};
