import { ChartLine, MessageSquareText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  cx,
  EmptyState,
  LoadingState,
  PageContainer,
  PageHeader,
  TableroWidget,
  Tabs,
  tabPanelProps,
} from '../../common/components/ui';
import { DailyChart } from '../../features/chat/metrics/DailyChart';
import { MetricsError } from '../../features/chat/metrics/MetricsError';
import { PeriodFilter } from '../../features/chat/metrics/PeriodFilter';
import { useMetricsPeriod } from '../../features/chat/metrics/useMetricsPeriod';
import { MESSAGES_PATH } from '../../features/chat/routes';
import { useInboxAccess } from '../../features/chat/useInboxAccess';
import { usePermiso } from '../../hooks/usePermiso';
import { useUrlParam } from '../../hooks/useUrlParam';
import { useChatMetrics } from '../../services/queries/chatMetrics';
import { formatDay } from '../../utils/format';
import { isInboxFilter, type InboxFilter } from './inboxTabs';
import { AttentionSection, LiveSummary } from './metrics/AttentionSection';
import { CompanyAssistantSection } from './metrics/CompanyAssistantSection';
import { LabelsSection } from './metrics/LabelsSection';
import { RepliesSection } from './metrics/RepliesSection';
import { SatisfactionSection } from './metrics/SatisfactionSection';

const TABS_ID = 'metrics-channel';
const CHANNEL_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'staff_customer', label: 'Clientes' },
  { id: 'staff_driver', label: 'Choferes' },
];
const CHANNEL_NAME: Record<InboxFilter, string> = {
  all: 'clientes y choferes',
  staff_customer: 'clientes',
  staff_driver: 'choferes',
};

const Header = ({ inbox }: { inbox: boolean }) => {
  const navigate = useNavigate();
  return (
    <PageHeader
      title="Métricas de mensajes"
      description="Cómo atiende el equipo a clientes y choferes. Los tiempos de primera respuesta se cuentan en minutos hábiles, según tu horario de atención."
      actions={
        inbox ? (
          <Button variant="secondary" icon={<MessageSquareText />} onClick={() => navigate(MESSAGES_PATH)}>
            Ir a la bandeja
          </Button>
        ) : undefined
      }
    />
  );
};

/**
 * «Mensajes → Métricas» (§15.2 y §16 del diseño de la comunicación): primera respuesta, objetivo, resolución, lo que
 * está abierto ahora, el asistente, la encuesta y la serie diaria (`GET /v2/chat/metrics`). Pide
 * `mensajes.supervisar`; todos los números los calcula la API.
 */
export const MessagesMetrics = () => {
  const supervise = usePermiso('mensajes.supervisar');
  const { any: inbox, configure } = useInboxAccess();
  const period = useMetricsPeriod();
  const [channelParam, setChannel] = useUrlParam('canal', 'all');
  const channel: InboxFilter = isInboxFilter(channelParam) ? channelParam : 'all';
  const { data, isPending, isPlaceholderData, error, refetch } = useChatMetrics(
    { ...period.query, channel: channel === 'all' ? undefined : channel },
    supervise.allowed && !period.error,
  );

  if (!supervise.known) {
    return (
      <PageContainer>
        <Header inbox={inbox} />
        <LoadingState label="Cargando las métricas…" />
      </PageContainer>
    );
  }
  if (!supervise.allowed) {
    return (
      <PageContainer>
        <Header inbox={inbox} />
        <Card>
          <EmptyState
            icon={ChartLine}
            title="No tenés permiso para ver las métricas de los mensajes"
            description="Pedile a quien administra la empresa el permiso «Supervisar los mensajes»."
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer stack>
      <Header inbox={inbox} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter
          range={period.range}
          shown={data && !period.error ? { from: data.from, to: data.to } : undefined}
          preset={period.preset}
          onPreset={period.setPreset}
          onRange={period.setRange}
        />
        {data && !period.error && (
          <p className="text-[13px] text-muted" aria-live="polite">
            Del {formatDay(data.from)} al {formatDay(data.to)}
          </p>
        )}
      </div>
      {period.error ? (
        <Card>
          <EmptyState title="Revisá el período" description={period.error} illustration="search" />
        </Card>
      ) : error ? (
        <MetricsError
          error={error}
          forbiddenTitle="No tenés permiso para ver las métricas de los mensajes"
          resource="Las métricas"
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <LoadingState fullPage label="Cargando las métricas…" />
      ) : (
        <>
          <Card>
            <Tabs
              items={CHANNEL_TABS}
              value={channel}
              onChange={setChannel}
              label="Canal de las métricas"
              idPrefix={TABS_ID}
            />
            <p className="px-4 py-3 text-[13px] text-muted">
              {channel === 'staff_driver'
                ? 'Sólo las conversaciones con los choferes. La encuesta y el asistente son de los clientes.'
                : channel === 'staff_customer'
                  ? 'Sólo las conversaciones con los clientes.'
                  : 'Las conversaciones con clientes y choferes juntas.'}
            </p>
          </Card>
          <div
            {...tabPanelProps(TABS_ID, channel)}
            aria-busy={isPlaceholderData || undefined}
            className={cx('grid gap-6 transition-opacity', isPlaceholderData && 'opacity-60')}
          >
            <div className="-mb-4">
              <LiveSummary live={data.live} channelName={CHANNEL_NAME[channel]} />
            </div>
            <AttentionSection metrics={data} canConfigure={configure} />
            <TableroWidget
              title="Día por día"
              subtitle="Conversaciones nuevas y mediana de la primera respuesta de cada día."
              empty={
                data.conversations === 0
                  ? { title: 'Sin conversaciones en el período', description: 'Probá con otro período o canal.' }
                  : null
              }
            >
              <DailyChart daily={data.daily} />
            </TableroWidget>
            {data.assistant && <CompanyAssistantSection assistant={data.assistant} canConfigure={configure} />}
            {data.satisfaction && <SatisfactionSection satisfaction={data.satisfaction} />}
            <LabelsSection byLabel={data.byLabel} canConfigure={configure} />
            <RepliesSection automaticReplies={data.automaticReplies} quickReplies={data.quickReplies} />
          </div>
        </>
      )}
    </PageContainer>
  );
};
