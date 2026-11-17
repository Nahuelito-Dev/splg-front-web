import { useState } from 'react';
import { Copy, MessageSquarePlus, Sparkles } from 'lucide-react';
import { Badge, Button, EmptyState, PageContainer, PageHeader, Tabs, tabPanelProps } from '../../common/components/ui';
import { usePermiso, usePermissions, useUrlParams } from '../../hooks';
import type { AssistantFaq } from '../../services/api/types';
import { useCompanyFaqs, useCopyCompanyFaqTemplates, useDeleteCompanyFaq } from '../../services/queries/assistant';
import { confirm, notify } from '../../utils/notifications';
import { CopyTemplatesModal } from './components/CopyTemplatesModal';
import { FaqBoard } from './components/FaqBoard';
import { FaqFormModal } from './components/FaqFormModal';
import { FaqListArea } from './components/FaqListArea';
import { KnowledgeBaseNotice } from './components/KnowledgeBaseNotice';
import { copiedMessage, draftCount, fullHint } from './faqRules';
import { CompanyPreviewTab } from './lab/CompanyPreviewTab';
import { CompanyUnansweredTab } from './lab/CompanyUnansweredTab';
import { RegressionTab } from './lab/RegressionTab';

const TITLE = 'Asistente del chat';
const DESCRIPTION = 'Las preguntas frecuentes con las que el asistente les responde a tus clientes en el chat.';
const COPY_LABEL = 'Cargar preguntas de ejemplo';
const TABS_ID = 'company-assistant-tabs';
type Tab = 'faqs' | 'test' | 'unanswered' | 'regression';
/** Lo que se limpia al cambiar de pestaña: la búsqueda, el estado y el período son de cada una. */
const TAB_RESET = { q: '', status: '', from: '', to: '' };

/**
 * Asistente de la distribuidora (DISENO-CH-BOT §4.3, módulo M8): la base de conocimiento y, en pestañas, el probador,
 * las preguntas sin respuesta y el lote de pruebas. La ruta va dentro de `RequireModule module="assistant"`: si la
 * función no está habilitada se ve «No disponible» y esta página no se monta.
 */
export const AssistantFaqs = () => {
  const { canWrite, writeHint, inSupport } = usePermissions();
  const manage = usePermiso('asistente.gestionar');
  const view = usePermiso('asistente.ver');
  const [params, setParams] = useUrlParams({ tab: 'faqs', ...TAB_RESET });
  const { data, error, isPending, refetch } = useCompanyFaqs();
  const copy = useCopyCompanyFaqTemplates();
  const remove = useDeleteCompanyFaq({
    onSuccess: () => notify.success('Pregunta dada de baja'),
    onError: notify.error,
  });
  const [editing, setEditing] = useState<AssistantFaq | null>(null);
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState(false);

  // Sin `asistente.gestionar` la base se ve pero no se toca (la API igual respondería 403). Las acciones aparecen
  // recién cuando se saben los permisos (si no se pudieron leer, `usePermiso` deja pasar y decide la API). En modo
  // soporte los botones se ven apagados, con el motivo; las acciones de cada pregunta, no.
  const mayManage = manage.known && manage.allowed;
  const canManage = canWrite && mayManage;
  const manageHint = canWrite ? undefined : writeHint;
  const loadHint = !data ? (error ? 'No se pudo cargar la lista' : 'Cargando la lista…') : undefined;
  const limitHint = data ? fullHint(data.items.length, data.limit) : undefined;
  // Probar y escribir piden `asistente.gestionar`; el lote se ve con `asistente.ver`. Las preguntas sin respuesta traen
  // texto de los clientes: sólo las ve el admin de la empresa (en modo soporte la API responde 403).
  const tabs = [
    { id: 'faqs', label: 'Preguntas frecuentes' },
    ...(mayManage ? [{ id: 'test', label: 'Probar' }] : []),
    ...(mayManage && !inSupport ? [{ id: 'unanswered', label: 'Sin respuesta' }] : []),
    ...(view.known && view.allowed ? [{ id: 'regression', label: 'Lote de pruebas' }] : []),
  ];
  const tab = (tabs.find((item) => item.id === params.tab)?.id ?? 'faqs') as Tab;
  const onFaqs = tab === 'faqs';

  const copyTemplates = () =>
    copy.mutate(undefined, {
      onSuccess: ({ copied }) => {
        notify.success(copiedMessage(copied));
        setCopying(false);
      },
      onError: notify.error,
    });

  const askDelete = async (faq: AssistantFaq) => {
    const ok = await confirm({
      title: '¿Dar de baja la pregunta?',
      text: `El asistente deja de usar «${faq.question}». Si después la necesitás, la podés volver a cargar.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (ok) remove.mutate(faq.id);
  };

  const copyButton = (variant: 'primary' | 'secondary') => (
    <Button
      variant={variant}
      icon={<Copy className="h-4 w-4" aria-hidden="true" />}
      blockedReason={manageHint}
      onClick={() => setCopying(true)}
    >
      {COPY_LABEL}
    </Button>
  );

  return (
    <PageContainer size="md" stack>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        secondaryActions={
          onFaqs && mayManage && data && data.items.length > 0
            ? [
                {
                  label: COPY_LABEL,
                  icon: <Copy className="h-4 w-4" aria-hidden="true" />,
                  onClick: () => setCopying(true),
                  blockedReason: manageHint ?? limitHint,
                },
              ]
            : []
        }
        actions={
          onFaqs &&
          mayManage && (
            <Button
              icon={<MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
              blockedReason={manageHint ?? loadHint ?? limitHint}
              onClick={() => setCreating(true)}
            >
              Nueva pregunta
            </Button>
          )
        }
      />
      {tabs.length > 1 && (
        <div className="-mx-4 md:mx-0">
          <Tabs
            idPrefix={TABS_ID}
            label="Secciones del asistente"
            value={tab}
            onChange={(id) => setParams({ tab: id, ...TAB_RESET })}
            items={tabs}
          />
        </div>
      )}
      <div {...tabPanelProps(TABS_ID, tab)} className="space-y-6">
        {onFaqs && (
          <>
            {data && (
              <KnowledgeBaseNotice
                version={data.version}
                count={data.items.length}
                limit={data.limit}
                audience="tus clientes, en el chat"
                drafts={draftCount(data.items)}
              />
            )}
            <FaqListArea isPending={isPending} error={error} hasData={Boolean(data)} onRetry={() => void refetch()}>
              <FaqBoard
                items={data?.items ?? []}
                empty={
                  <EmptyState
                    icon={Sparkles}
                    title="Todavía no hay preguntas frecuentes"
                    description="Empezá con las preguntas de ejemplo (horarios, medios de pago, zonas, estado del pedido) y ajustalas a tu distribuidora, o escribí las tuyas."
                    action={
                      mayManage && (
                        <div className="flex flex-wrap justify-center gap-2">
                          {copyButton('primary')}
                          <Button variant="secondary" blockedReason={manageHint} onClick={() => setCreating(true)}>
                            Escribir una pregunta
                          </Button>
                        </div>
                      )
                    }
                  />
                }
                renderMeta={(faq) =>
                  faq.key ? <Badge label={{ text: 'De una pregunta de ejemplo', tone: 'info' }} /> : null
                }
                onEdit={canManage ? setEditing : undefined}
                onDelete={canManage ? (faq) => void askDelete(faq) : undefined}
                withDrafts
              />
            </FaqListArea>
          </>
        )}
        {tab === 'test' && <CompanyPreviewTab blockedReason={manageHint} />}
        {tab === 'unanswered' && <CompanyUnansweredTab />}
        {tab === 'regression' && <RegressionTab mayManage={mayManage} writeHint={manageHint} />}
      </div>
      <FaqFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        faq={editing}
      />
      {canManage && (
        <CopyTemplatesModal
          open={copying}
          onClose={() => setCopying(false)}
          onConfirm={copyTemplates}
          pending={copy.isPending}
          count={data?.items.length ?? 0}
          limit={data?.limit ?? 0}
        />
      )}
    </PageContainer>
  );
};
