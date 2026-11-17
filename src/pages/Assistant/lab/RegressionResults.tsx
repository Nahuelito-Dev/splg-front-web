import { Badge } from '../../../common/components/ui';
import type { RegressionCaseResult } from '../../../services/api/types';
import { labelOf, REGRESSION_EXPECTED, REGRESSION_OUTCOME } from '../../../utils/statusLabels';
import { PreviewAnswer } from './PreviewAnswer';

interface Props {
  results: RegressionCaseResult[];
}

/** Primero lo que hay que mirar: los que no pasaron, después los que no se pudieron juzgar y al final los que pasaron. */
const ORDER: Record<RegressionCaseResult['outcome'], number> = { failed: 0, error: 1, passed: 2 };

/** El resultado de cada caso: si pasó y, si no, por qué; con lo que contestó, plegado. */
export const RegressionResults = ({ results }: Props) => {
  if (results.length === 0) return <p className="text-sm text-muted">Todavía no hay casos corridos.</p>;
  const sorted = [...results].sort((a, b) => ORDER[a.outcome] - ORDER[b.outcome]);
  return (
    <ul className="divide-y divide-outline rounded-xl border border-outline" aria-label="Resultado por caso">
      {sorted.map((result) => (
        <li key={result.caseId} className="space-y-2 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="min-w-0 break-words text-sm font-semibold text-ink">{result.question}</p>
            <Badge label={labelOf(REGRESSION_OUTCOME, result.outcome)} className="self-start" />
          </div>
          <p className="text-[13px] text-ink-2">
            {`Se esperaba: ${REGRESSION_EXPECTED[result.expected].text.toLowerCase()}`}
            {result.mustMention.length > 0 && ` y que mencione ${result.mustMention.join(', ')}`}
          </p>
          {result.outcome !== 'passed' && <p className="text-[13px] text-ink">{result.detail}</p>}
          {result.outcome !== 'error' && (
            <details className="group">
              <summary className="cursor-pointer text-[13px] font-medium text-primary">Ver lo que contestó</summary>
              <div className="mt-3">
                <PreviewAnswer result={result} scope="company" />
              </div>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
};
