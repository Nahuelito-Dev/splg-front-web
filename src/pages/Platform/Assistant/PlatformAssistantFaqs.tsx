import { PageContainer, PageHeader, Tabs, tabPanelProps } from '../../../common/components/ui';
import { usePermiso, useUrlParams } from '../../../hooks';
import {
  useCreatePlatformFaq,
  useCreatePlatformTemplate,
  useDeletePlatformFaq,
  useDeletePlatformTemplate,
  usePlatformFaqs,
  usePlatformTemplates,
  useUpdatePlatformFaq,
  useUpdatePlatformTemplate,
} from '../../../services/queries/assistant';
import { notify } from '../../../utils/notifications';
import { KnowledgeBaseNotice } from '../../Assistant/components/KnowledgeBaseNotice';
import { draftCount } from '../../Assistant/faqRules';
import { KeyedFaqPanel } from './KeyedFaqPanel';
import { PlatformPreviewTab } from './PlatformPreviewTab';
import { PlatformUnansweredTab } from './PlatformUnansweredTab';
import { SupportAssistantCard } from './SupportAssistantCard';

const TABS_ID = 'assistant-tabs';
type Tab = 'orixtech' | 'examples' | 'test' | 'unanswered';
/** Lo que se limpia al cambiar de pestaña: la búsqueda, el estado y el período son de cada una. */
const TAB_RESET = { q: '', status: '', from: '', to: '' };

const deleteNotices = { onSuccess: () => notify.success('Pregunta dada de baja'), onError: notify.error };

/** Las preguntas de OrixTech: contestan a las distribuidoras en el chat de soporte; las distribuidoras nunca las ven. */
const OrixTechFaqsTab = () => {
  const { data, error, isPending, refetch } = usePlatformFaqs();
  const create = useCreatePlatformFaq();
  const update = useUpdatePlatformFaq();
  const remove = useDeletePlatformFaq(deleteNotices);
  return (
    <KeyedFaqPanel
      data={data}
      error={error}
      isPending={isPending}
      onRetry={() => void refetch()}
      intro={
        data ? (
          <KnowledgeBaseNotice
            version={data.version}
            count={data.items.length}
            limit={data.limit}
            audience="las distribuidoras, en el chat de soporte de OrixTech. Son sólo de OrixTech: las distribuidoras nunca las ven ni las copian"
            drafts={draftCount(data.items)}
          />
        ) : (
          <p className="text-sm text-muted">
            Contestan a las distribuidoras en el chat de soporte. Las distribuidoras nunca las ven.
          </p>
        )
      }
      texts={{
        noun: 'pregunta de OrixTech',
        createLabel: 'Nueva pregunta',
        description: 'La usa el asistente del soporte de OrixTech. Las distribuidoras no la ven.',
        emptyTitle: 'Todavía no hay preguntas de OrixTech',
        emptyDescription: 'Cargá lo que más preguntan las distribuidoras en el chat de soporte.',
        deleteText: (faq) => `El asistente del soporte deja de usar «${faq.question}». Su clave queda libre.`,
      }}
      create={create}
      update={update}
      remove={remove.mutate}
      withDrafts
    />
  );
};

/** El catálogo de preguntas de ejemplo: el punto de partida que cada distribuidora copia y ajusta a su negocio. */
const ExampleFaqsTab = () => {
  const { data, error, isPending, refetch } = usePlatformTemplates();
  const create = useCreatePlatformTemplate();
  const update = useUpdatePlatformTemplate();
  const remove = useDeletePlatformTemplate(deleteNotices);
  return (
    <KeyedFaqPanel
      data={data}
      error={error}
      isPending={isPending}
      onRetry={() => void refetch()}
      intro={
        <section
          aria-label="Sobre las preguntas de ejemplo"
          className="rounded-card border border-info/30 bg-info-soft p-4 text-[13px] text-ink-2"
        >
          <p className="text-sm font-semibold text-ink">Preguntas de ejemplo para distribuidoras</p>
          <p className="mt-0.5">
            {`Cada distribuidora las suma a su base con «Cargar preguntas de ejemplo» y las ajusta a su negocio. Editar o dar de baja una acá no cambia lo que ya copiaron.${data ? ` ${data.items.length} de ${data.limit}.` : ''}`}
          </p>
        </section>
      }
      texts={{
        noun: 'pregunta de ejemplo',
        createLabel: 'Nueva pregunta de ejemplo',
        description: 'Las distribuidoras la pueden sumar a su base y ajustarla.',
        emptyTitle: 'Todavía no hay preguntas de ejemplo',
        emptyDescription:
          'Cargá preguntas típicas de una distribuidora (horarios, medios de pago, zonas): son el punto de partida de cada una.',
        deleteText: (faq) =>
          `«${faq.question}» deja de ofrecerse a las distribuidoras; su clave queda libre. Lo que ya copiaron sigue en sus bases.`,
      }}
      create={create}
      update={update}
      remove={remove.mutate}
    />
  );
};

/**
 * Asistente de la plataforma: el interruptor y los topes del asistente con IA del soporte, y en pestañas las preguntas
 * de OrixTech y el catálogo de preguntas de ejemplo.
 */
export const PlatformAssistantFaqs = () => {
  const [params, setParams] = useUrlParams({ tab: 'orixtech', ...TAB_RESET });
  // Probar y resolver las preguntas sin respuesta piden `plataforma.tickets.configurar`; verlas, `plataforma.tickets.ver`.
  const configure = usePermiso('plataforma.tickets.configurar');
  const view = usePermiso('plataforma.tickets.ver');
  const canConfigure = configure.known && configure.allowed;
  const tabs = [
    { id: 'orixtech', label: 'Preguntas de OrixTech' },
    { id: 'examples', label: 'Preguntas de ejemplo para distribuidoras' },
    ...(canConfigure ? [{ id: 'test', label: 'Probar' }] : []),
    ...(view.known && view.allowed ? [{ id: 'unanswered', label: 'Sin respuesta' }] : []),
  ];
  const tab = (tabs.find((item) => item.id === params.tab)?.id ?? 'orixtech') as Tab;
  return (
    <PageContainer size="md" stack>
      <PageHeader
        title="Asistente"
        description="Si el asistente del soporte contesta solo, sus topes, las preguntas con las que responde y las de ejemplo que copian las distribuidoras y cómo contestaría."
      />
      <SupportAssistantCard />
      <div className="-mx-4 md:mx-0">
        <Tabs
          idPrefix={TABS_ID}
          label="Preguntas del asistente"
          value={tab}
          // Cada pestaña tiene sus filtros: al cambiar de pestaña se limpian.
          onChange={(id) => setParams({ tab: id, ...TAB_RESET })}
          items={tabs}
        />
      </div>
      <div {...tabPanelProps(TABS_ID, tab)}>
        {tab === 'orixtech' && <OrixTechFaqsTab />}
        {tab === 'examples' && <ExampleFaqsTab />}
        {tab === 'test' && <PlatformPreviewTab />}
        {tab === 'unanswered' && <PlatformUnansweredTab canManage={canConfigure} />}
      </div>
    </PageContainer>
  );
};
