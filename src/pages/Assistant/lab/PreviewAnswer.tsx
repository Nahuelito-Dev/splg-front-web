import { Bot, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../common/components/ui';
import type { AssistantSource, RegressionCaseResult } from '../../../services/api/types';
import { ASSISTANT_LAYER, ASSISTANT_SOURCE_TYPE, labelOf } from '../../../utils/statusLabels';
import { faqSourceHref } from './labRules';

/** Lo que tienen en común la respuesta del probador y el resultado de un caso del lote. */
type Answer = Pick<
  RegressionCaseResult,
  'answer' | 'wouldHandOff' | 'handOffReasonLabel' | 'handOffCauseLabel' | 'sources' | 'layer'
>;

interface Props {
  result: Answer;
  /** De qué base son las preguntas frecuentes que se usaron (para el link). */
  scope: 'company' | 'platform';
}

const SourceItem = ({ source, scope }: { source: AssistantSource; scope: Props['scope'] }) => {
  const type = labelOf(ASSISTANT_SOURCE_TYPE, source.type);
  return (
    <li className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
      <Badge label={type} />
      {source.type === 'faq' ? (
        <Link to={faqSourceHref(scope, source.title)} className="break-words font-medium text-primary hover:underline">
          {source.title}
        </Link>
      ) : (
        source.title !== type.text && <span className="break-words">{source.title}</span>
      )}
    </li>
  );
};

/** Lo que vería el cliente (o que pasaría a una persona y por qué), con las fuentes y la capa que contestó. */
export const PreviewAnswer = ({ result, scope }: Props) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Badge label={labelOf(ASSISTANT_LAYER, result.layer)} />
      {result.wouldHandOff && <Badge label={{ text: 'Pasaría a una persona', tone: 'warn' }} />}
    </div>
    {result.wouldHandOff ? (
      <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-ink">
        <UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        <div className="min-w-0">
          <p className="font-semibold">No contestaría: le pasaría la conversación a alguien del equipo</p>
          {result.handOffReasonLabel && <p className="mt-0.5 text-ink-2">{`Motivo: ${result.handOffReasonLabel}`}</p>}
          {result.handOffCauseLabel && <p className="mt-0.5 text-ink-2">{`Por qué: ${result.handOffCauseLabel}`}</p>}
        </div>
      </div>
    ) : (
      <figure className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-strong"
        >
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-outline bg-surface-muted p-3">
          <figcaption className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Respuesta automática
          </figcaption>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-ink">{result.answer}</p>
        </div>
      </figure>
    )}
    <section aria-label="Fuentes usadas">
      <p className="text-xs font-semibold text-muted">Fuentes usadas</p>
      {result.sources.length === 0 ? (
        <p className="mt-1 text-[13px] text-muted">Ninguna</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {result.sources.map((source) => (
            <SourceItem key={`${source.type}:${source.id ?? source.title}`} source={source} scope={scope} />
          ))}
        </ul>
      )}
    </section>
  </div>
);
