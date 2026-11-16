import {
  Card,
  cx,
  EmptyState,
  LoadingState,
  PageContainer,
  PageHeader,
  TableroWidget,
} from '../../../common/components/ui';
import { ToolbarContext } from '../../../common/components/ui/toolbarContext';
import { AssistantPanel } from '../../../features/chat/metrics/AssistantPanel';
import { MetricsError } from '../../../features/chat/metrics/MetricsError';
import { PeriodFilter } from '../../../features/chat/metrics/PeriodFilter';
import { useMetricsPeriod } from '../../../features/chat/metrics/useMetricsPeriod';
import { useUrlParam } from '../../../hooks/useUrlParam';
import { usePlatformChatMetrics } from '../../../services/queries/chatMetrics';
import { formatDay } from '../../../utils/format';
import { CompanySelect } from '../components/CompanySelect';
import { CompanyUsageTable } from './metrics/CompanyUsageTable';
import { SupportChatSection } from './metrics/SupportChatSection';
import { SupportTicketsSection } from './metrics/SupportTicketsSection';

/**
 * «Tablero de soporte» (§15.1 y §16 del diseño de la comunicación): el chat con las empresas, los tickets, el asistente
 * del soporte y el uso del chat por empresa (`GET /v2/platform/chat/metrics`). Sólo conteos y tiempos, nunca el texto
 * de los mensajes; todos los números los calcula la API.
 */
export const SupportMetrics = () => {
  const period = useMetricsPeriod();
  const [companyId, setCompanyId] = useUrlParam('empresa', '');
  const { data, isPending, isPlaceholderData, error, refetch } = usePlatformChatMetrics(
    { ...period.query, distributorId: companyId || undefined },
    !period.error,
  );

  return (
    <PageContainer stack>
      <PageHeader
        title="Tablero de soporte"
        description="Cómo responde el soporte a las empresas por chat y por ticket, y cuánto usa cada empresa el chat con sus clientes. Los tiempos de primera respuesta van en minutos hábiles del horario del soporte."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <PeriodFilter
            range={period.range}
            shown={data && !period.error ? { from: data.from, to: data.to } : undefined}
            preset={period.preset}
            onPreset={period.setPreset}
            onRange={period.setRange}
          />
          {/* La versión de barra: la etiqueta adentro («Empresa: Todas»), a la altura de los botones del período. */}
          <ToolbarContext.Provider value={true}>
            <CompanySelect value={companyId} onChange={setCompanyId} emptyLabel="Todas" />
          </ToolbarContext.Provider>
        </div>
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
          forbiddenTitle="No tenés permiso para ver el tablero de soporte"
          resource="La empresa"
          notFoundDescription="Puede haberse dado de baja. Elegí otra o volvé a «Todas»."
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <LoadingState fullPage label="Cargando el tablero de soporte…" />
      ) : (
        <div
          aria-busy={isPlaceholderData || undefined}
          className={cx('grid gap-6 transition-opacity', isPlaceholderData && 'opacity-60')}
        >
          <SupportChatSection chat={data.chat} />
          <SupportTicketsSection tickets={data.tickets} />
          <section aria-labelledby="support-assistant-title" className="grid gap-3">
            <h2 id="support-assistant-title" className="text-base font-semibold text-ink">
              Asistente del soporte
            </h2>
            <AssistantPanel assistant={data.assistant} audience="las empresas" />
          </section>
          <TableroWidget
            title="Uso del chat por empresa"
            subtitle="Conversaciones y mensajes de cada empresa con sus clientes y choferes en el período, de la que más escribió a la que menos. Sólo conteos."
            bodyClassName="px-0 pb-0 pt-1"
          >
            <CompanyUsageTable companies={data.companies} />
          </TableroWidget>
        </div>
      )}
    </PageContainer>
  );
};
