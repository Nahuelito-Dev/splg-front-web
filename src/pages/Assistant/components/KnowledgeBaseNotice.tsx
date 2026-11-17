import { Bot } from 'lucide-react';

interface Props {
  /** Versión de la base: sube con cada cambio. */
  version: number;
  count: number;
  limit: number;
  /** A quién le responde el asistente con esta base. */
  audience: string;
  /** Las que están en borrador: cuentan para el tope, pero el asistente no las usa. */
  drafts?: number;
}

/** Aviso fijo de la base: con esto va a responder el asistente, siempre identificado como respuesta automática. */
export const KnowledgeBaseNotice = ({ version, count, limit, audience, drafts = 0 }: Props) => (
  <section
    aria-label="Sobre esta base de conocimiento"
    className="flex flex-col gap-3 rounded-card border border-info/30 bg-info-soft p-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-info">
        <Bot className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          Respuestas automáticas: el asistente va a responder con estas preguntas frecuentes
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {`A ${audience}. Cada respuesta va a llevar la marca «Respuesta automática».`}
        </p>
        {drafts > 0 && (
          <p className="mt-0.5 text-[13px] text-ink-2">
            {drafts === 1
              ? '1 está en borrador: el asistente no la usa hasta que tenga respuesta.'
              : `${drafts} están en borrador: el asistente no las usa hasta que tengan respuesta.`}
          </p>
        )}
      </div>
    </div>
    <dl className="flex shrink-0 gap-4 text-[13px] sm:text-right">
      <div>
        <dt className="text-muted">Versión</dt>
        <dd className="font-semibold tabular-nums text-ink">{version}</dd>
      </div>
      <div>
        <dt className="text-muted">Preguntas</dt>
        <dd className="font-semibold tabular-nums text-ink">{`${count} de ${limit}`}</dd>
      </div>
    </dl>
  </section>
);
