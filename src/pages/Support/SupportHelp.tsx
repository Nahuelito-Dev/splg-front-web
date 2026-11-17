import { Card, PageContainer, PageHeader, Tabs, tabPanelProps } from '../../common/components/ui';
import { useUrlParam } from '../../hooks/useUrlParam';
import { useCompanySupportSummary } from '../../services/queries/supportChat';
import { usePlatform } from '../../services/queries/supportSessions';
import { CompanyChatPanel } from './CompanyChatPanel';
import { CompanyTicketsPanel } from './CompanyTicketsPanel';

const TAB_PREFIX = 'support-help';

/**
 * «Ayuda» de la empresa (§15.2): el chat en vivo con la plataforma y los tickets de soporte. Núcleo: anda también con
 * la empresa suspendida. La ve quien tiene `soporte.ver`; escribe quien tiene `soporte.gestionar`.
 */
export const SupportHelp = () => {
  const platformName = usePlatform().data?.name ?? 'la plataforma';
  const [tab, setTab] = useUrlParam('tab', 'chat');
  const summary = useCompanySupportSummary(true);
  const active = tab === 'tickets' ? 'tickets' : 'chat';
  return (
    <PageContainer size="lg" stack>
      <PageHeader
        title={`Ayuda de ${platformName}`}
        description="Lo que se resuelve en el momento, por el chat. Lo que necesita seguimiento, en un ticket."
      />
      <Card className="overflow-hidden">
        <Tabs
          label="Ayuda"
          idPrefix={TAB_PREFIX}
          value={active}
          onChange={setTab}
          items={[
            { id: 'chat', label: 'Chat', count: summary.data ? summary.data.chatUnread || undefined : undefined },
            {
              id: 'tickets',
              label: 'Tickets',
              count: summary.data ? summary.data.ticketsUnread || undefined : undefined,
            },
          ]}
        />
        <div {...tabPanelProps(TAB_PREFIX, active)}>
          {active === 'chat' ? (
            <div className="flex h-[calc(100dvh-310px)] min-h-[440px] flex-col">
              <CompanyChatPanel />
            </div>
          ) : (
            <CompanyTicketsPanel />
          )}
        </div>
      </Card>
    </PageContainer>
  );
};
