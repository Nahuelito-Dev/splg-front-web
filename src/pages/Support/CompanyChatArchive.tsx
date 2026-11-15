import { Link, useParams } from 'react-router-dom';
import { Card, PageContainer, PageHeader } from '../../common/components/ui';
import { ChatThread } from '../../features/chat/components/ChatThread';
import { companyTicketHref, SUPPORT_PATH } from '../../features/chat/routes';
import { useCompanyArchivedChatThread } from '../../services/queries/chatSources';
import { usePlatform } from '../../services/queries/supportSessions';

/**
 * Un chat con la plataforma, por su id: el de origen de un ticket («Ver en el chat») o uno anterior del historial.
 * Sólo para leer: se escribe siempre en el chat abierto («Ayuda» → Chat).
 */
export const CompanyChatArchive = () => {
  const { id = '' } = useParams();
  const platformName = usePlatform().data?.name ?? 'el soporte';
  const binding = useCompanyArchivedChatThread(id);
  return (
    <PageContainer size="md" stack>
      <PageHeader
        title={`Chat con ${platformName}`}
        description="Un chat para releer. Para escribir, usá el chat abierto en Ayuda."
      />
      <Card className="flex h-[calc(100dvh-220px)] min-h-[420px] flex-col overflow-hidden p-0">
        <ChatThread
          side="company"
          source={binding.source}
          counterpartName={platformName}
          ctx={{ platformName, ticketHref: companyTicketHref }}
          canWrite={false}
          readOnlyNotice={
            <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">
              Sólo lectura.{' '}
              <Link to={SUPPORT_PATH} className="font-medium text-primary underline">
                Ir al chat abierto
              </Link>
            </p>
          }
          empty={<p className="px-4 py-10 text-center text-sm text-muted">Este chat no tiene mensajes.</p>}
        />
      </Card>
    </PageContainer>
  );
};
