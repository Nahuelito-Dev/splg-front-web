import type { ImportConfirm } from '../../../services/api/types';
import { formatDateTime, formatNumber } from '../../../utils/format';
import { IMPORT_CONFIG } from './importConfig';

interface Props {
  result: ImportConfirm;
}

/** Paso 3: lo que se aplicó. */
export const ImportDoneStep = ({ result }: Props) => {
  const labels = IMPORT_CONFIG[result.recurso].summaryLabels;
  return (
    <div className="space-y-4" role="status">
      <p className="text-sm font-semibold text-success">
        {result.yaConfirmada ? 'Esta importación ya estaba confirmada' : 'Importación confirmada'}
      </p>
      {result.yaConfirmada && <p className="text-sm text-muted">No se aplicó de nuevo.</p>}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(result.resumen).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-outline bg-surface px-3 py-2">
            <dt className="text-xs text-muted">{labels[key] ?? key}</dt>
            <dd className="text-xl font-semibold text-ink">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">Confirmada el {formatDateTime(result.confirmadaEn)}.</p>
    </div>
  );
};
