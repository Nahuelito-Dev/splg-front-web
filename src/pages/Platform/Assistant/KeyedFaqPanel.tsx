import { useState, type ReactNode } from 'react';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { Button, EmptyState } from '../../../common/components/ui';
import { confirm } from '../../../utils/notifications';
import { FaqBoard } from '../../Assistant/components/FaqBoard';
import { FaqListArea } from '../../Assistant/components/FaqListArea';
import { fullHint } from '../../Assistant/faqRules';
import { KeyedFaqFormModal, type KeyedFaq, type KeyedFaqTexts } from './KeyedFaqFormModal';

interface Texts extends KeyedFaqTexts {
  /** Botón de alta («Nueva pregunta de OrixTech»). */
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Qué pasa al darla de baja. */
  deleteText: (faq: KeyedFaq) => string;
}

interface Props<T extends KeyedFaq & { position: number }> {
  data: { items: T[]; limit: number } | undefined;
  error: unknown;
  isPending: boolean;
  onRetry: () => void;
  /** Qué es esta lista y para quién (arriba de todo). */
  intro: ReactNode;
  texts: Texts;
  create: Parameters<typeof KeyedFaqFormModal>[0]['create'];
  update: Parameters<typeof KeyedFaqFormModal>[0]['update'];
  /** Baja: los avisos los da la mutación (ver `useDelete`). */
  remove: (id: string) => void;
}

/** Una lista de preguntas con clave de la plataforma (las de OrixTech o las de ejemplo), con su alta, edición y baja. */
export const KeyedFaqPanel = <T extends KeyedFaq & { position: number }>({
  data,
  error,
  isPending,
  onRetry,
  intro,
  texts,
  create,
  update,
  remove,
}: Props<T>) => {
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const blocked = !data
    ? error
      ? 'No se pudo cargar la lista'
      : 'Cargando la lista…'
    : fullHint(data.items.length, data.limit);

  const askDelete = async (faq: T) => {
    const ok = await confirm({
      title: '¿Dar de baja la pregunta?',
      text: texts.deleteText(faq),
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (ok) remove(faq.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">{intro}</div>
        <Button
          icon={<MessageSquarePlus aria-hidden="true" />}
          blockedReason={blocked}
          onClick={() => setCreating(true)}
          className="shrink-0"
        >
          {texts.createLabel}
        </Button>
      </div>
      <FaqListArea isPending={isPending} error={error} hasData={Boolean(data)} onRetry={onRetry}>
        <FaqBoard
          items={data?.items ?? []}
          empty={
            <EmptyState
              icon={Sparkles}
              title={texts.emptyTitle}
              description={texts.emptyDescription}
              action={
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  Escribir una pregunta
                </Button>
              }
            />
          }
          renderMeta={(faq) => (
            <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
              {faq.key}
            </code>
          )}
          onEdit={setEditing}
          onDelete={(faq) => void askDelete(faq)}
        />
      </FaqListArea>
      <KeyedFaqFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        faq={editing}
        texts={texts}
        create={create}
        update={update}
      />
    </div>
  );
};
