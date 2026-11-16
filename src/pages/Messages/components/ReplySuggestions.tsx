import { Sparkles } from 'lucide-react';
import { useConversationSuggestions } from '../../../services/queries/inbox';

interface Props {
  conversationId: string;
  /** El último mensaje del cliente o del chofer en el hilo: cuando escribe otro, se piden de nuevo. */
  lastCounterpartSeq: number;
  /** Pega el texto en el compositor para editarlo (no lo envía). */
  onPick: (text: string) => void;
}

/**
 * Hasta 3 respuestas guardadas parecidas a lo último que escribió la persona, como chips arriba del compositor. Un
 * clic (o Enter con el foco en el chip) pega el texto con las variables ya completadas; quien atiende lo revisa y lo
 * envía. Sin sugerencias no ocupan lugar.
 */
export const ReplySuggestions = ({ conversationId, lastCounterpartSeq, onPick }: Props) => {
  const { data, error, refetch, isFetching } = useConversationSuggestions(
    conversationId,
    lastCounterpartSeq,
    lastCounterpartSeq > 0,
  );

  // El cliente o el chofer no tiene ningún mensaje para buscar (o se borró el único): no se ofrece nada.
  if (lastCounterpartSeq <= 0) return null;
  if (error && !data) {
    return (
      <p className="mb-2 flex flex-wrap items-center gap-x-2 px-1 text-xs text-muted" role="status">
        No se pudieron traer las respuestas sugeridas.
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          Reintentar
        </button>
      </p>
    );
  }
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div role="group" aria-label="Respuestas sugeridas" className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
        <Sparkles aria-hidden="true" className="h-3 w-3" />
        Sugeridas
      </span>
      {items.map((item) => (
        <button
          key={item.templateId}
          type="button"
          onClick={() => onPick(item.body)}
          title={item.body}
          aria-label={`Usar «${item.title}» en el mensaje: ${item.body}`}
          className="max-w-full truncate rounded-full border border-primary-edge bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:max-w-[16rem]"
        >
          {item.title}
        </button>
      ))}
    </div>
  );
};
