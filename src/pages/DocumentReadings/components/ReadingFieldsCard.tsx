import { ListChecks } from 'lucide-react';
import { Badge, Card, CardHeader } from '../../../common/components/ui';
import type { DocumentReading } from '../../../services/api/types';
import type { Tone } from '../../../utils/statusLabels';
import { displayValue, fieldLabel, fieldNames } from '../documentReadingRules';

type Confidence = DocumentReading['fields'][number]['confianza'];

const CONFIDENCE: Record<Confidence, { text: string; tone: Tone }> = {
  alta: { text: 'Confianza alta', tone: 'success' },
  media: { text: 'Confianza media', tone: 'warn' },
  baja: { text: 'Confianza baja', tone: 'danger' },
};

interface Props {
  reading: DocumentReading;
}

/** Cada dato: lo que se leyó (con su confianza), lo que el sistema tiene y, si no coinciden, por qué. */
export const ReadingFieldsCard = ({ reading }: Props) => {
  const names = fieldNames(reading);
  const read = new Map(reading.fields.map((f) => [f.nombre, f]));
  const expected = reading.proposal?.expected ?? {};
  const hasExpected = Boolean(reading.proposal);
  const differences = new Map((reading.proposal?.differences ?? []).map((d) => [d.field, d]));
  const corrections = new Map((reading.corrections ?? []).map((c) => [c.field, c]));

  return (
    <Card className="p-5">
      <CardHeader
        title="Datos leídos"
        subtitle={hasExpected ? 'Lo que dice el documento al lado de lo que tiene el sistema.' : undefined}
        icon={<ListChecks aria-hidden="true" className="h-4 w-4" />}
      />
      {names.length === 0 ? (
        <p className="text-sm text-muted">De este tipo de documento no se extraen datos.</p>
      ) : (
        <>
          {hasExpected && (
            <div
              aria-hidden="true"
              className="hidden gap-1 border-b border-outline-soft pb-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]"
            >
              <span>Dato</span>
              <span>Leído</span>
              <span>En el sistema</span>
            </div>
          )}
          <ul className="divide-y divide-outline-soft" aria-label="Datos leídos">
            {names.map((name) => {
              const field = read.get(name);
              const difference = differences.get(name);
              const correction = corrections.get(name);
              return (
                <li key={name} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
                  <span className="text-[13px] font-medium text-muted">{fieldLabel(name)}</span>
                  <div className="min-w-0">
                    <span className="sr-only">Leído: </span>
                    <span className="break-words font-mono text-sm text-ink">{displayValue(name, field?.valor)}</span>
                    {field?.valor && (
                      <span className="ml-2 inline-block align-middle">
                        <Badge label={CONFIDENCE[field.confianza]} />
                      </span>
                    )}
                    {correction && (
                      <p className="text-xs text-success">
                        Corregido a <span className="font-mono">{displayValue(name, correction.value)}</span>
                      </p>
                    )}
                  </div>
                  {hasExpected && (
                    <div className="min-w-0">
                      <span className="text-xs text-muted sm:sr-only">En el sistema: </span>
                      <span className="break-words font-mono text-sm text-ink-2">
                        {displayValue(name, expected[name])}
                      </span>
                      {difference && (
                        <p role="note" className="text-xs font-medium text-danger">
                          {difference.message}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
};
