import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, cx, EmptyState, PageContainer, PageHeader } from '../../../common/components/ui';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { useUrlParam } from '../../../hooks/useUrlParam';
import { platformChatHref } from '../../../features/chat/routes';
import { useSupportSettings } from '../../../services/queries/supportChat';
import { useMyAccount } from '../../../services/queries/users';
import { notify } from '../../../utils/notifications';
import { PlatformChatList, type ChatInboxTab } from './PlatformChatList';
import { PlatformChatPanel } from './PlatformChatPanel';
import { StartChatModal } from './StartChatModal';

const isTab = (value: string): value is ChatInboxTab => value === 'waiting' || value === 'mine' || value === 'all';

/** Si el chat está en horario de atención (`openNow` de la configuración del soporte). */
const HoursBadge = () => {
  const { data } = useSupportSettings(true);
  if (!data) return null;
  return (
    <Badge
      label={
        data.openNow
          ? { text: 'En horario de atención', tone: 'success' }
          : { text: 'Fuera de horario: las empresas reciben la respuesta automática', tone: 'warn' }
      }
    />
  );
};

/**
 * «Chat con empresas» (§15.1): la bandeja de chats abiertos (Esperando / Míos / Todos) y, al elegir uno, su hilo en
 * vivo con el lateral de la empresa. En pantallas chicas se ve una columna por vez.
 */
export const PlatformChats = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabParam, setTab] = useUrlParam('tab', 'waiting');
  const tab: ChatInboxTab = isTab(tabParam) ? tabParam : 'waiting';
  const [starting, setStarting] = useState(false);
  const email = useAppSelector((state) => state.auth.email);
  const me = useMyAccount(email).data?.user_id;

  return (
    <PageContainer size="full" stack>
      <PageHeader
        title="Chat con empresas"
        description="Lo que las empresas preguntan en el momento. Tomá un chat para atenderlo; si necesita seguimiento, abrí un ticket con sus mensajes."
        badges={<HoursBadge />}
        actions={
          <Button icon={<MessageSquarePlus />} onClick={() => setStarting(true)}>
            Escribirle a una empresa
          </Button>
        }
      />
      <div className="grid h-[calc(100dvh-230px)] min-h-[520px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className={cx('flex min-h-0 flex-col overflow-hidden p-0', id && 'hidden lg:flex')}>
          <PlatformChatList tab={tab} onTab={setTab} selectedId={id} />
        </Card>
        <div className={cx('min-h-0 flex-col', id ? 'flex' : 'hidden lg:flex')}>
          {id ? (
            <PlatformChatPanel key={id} id={id} myUserId={me} />
          ) : (
            <Card className="grid flex-1 place-items-center">
              <EmptyState title="Elegí un chat" description="Los que esperan atención están en «Esperando»." />
            </Card>
          )}
        </div>
      </div>
      <StartChatModal
        open={starting}
        onClose={() => setStarting(false)}
        onStarted={(message) => {
          setStarting(false);
          notify.success('Mensaje enviado');
          navigate(platformChatHref(message.conversationId));
        }}
      />
    </PageContainer>
  );
};
