import type { ReactNode } from 'react';
import { RowActions } from '../../../common/components/ui';

interface Item {
  id: string;
  position: number;
  question: string;
  answer: string;
}

interface Props<T extends Item> {
  items: T[];
  /** Etiquetas de cada pregunta (su clave, si salió de una pregunta de ejemplo). */
  renderMeta?: (faq: T) => ReactNode;
  /** Sin permiso de gestión no se pasan: la fila no dibuja los botones. */
  onEdit?: (faq: T) => void;
  onDelete?: (faq: T) => void;
}

/** La base de conocimiento como la lee el asistente: en orden, con la pregunta y la respuesta completas. */
export const FaqList = <T extends Item>({ items, renderMeta, onEdit, onDelete }: Props<T>) => (
  <ol className="divide-y divide-outline" aria-label="Preguntas frecuentes">
    {items.map((faq) => (
      <li key={faq.id} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-ink-2"
        >
          {faq.position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="min-w-0 break-words text-sm font-semibold text-ink">
              <span className="sr-only">{`Pregunta ${faq.position}: `}</span>
              {faq.question}
            </p>
            {(onEdit || onDelete) && (
              <RowActions
                rowLabel={`la pregunta «${faq.question}»`}
                onEdit={onEdit ? () => onEdit(faq) : undefined}
                onDelete={onDelete ? () => onDelete(faq) : undefined}
                deleteLabel="Dar de baja"
              />
            )}
          </div>
          <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-relaxed text-muted">{faq.answer}</p>
          {renderMeta && <div className="mt-2 flex flex-wrap items-center gap-2">{renderMeta(faq)}</div>}
        </div>
      </li>
    ))}
  </ol>
);
