import { TableroBarList, TableroWidget } from '../../../common/components/ui';
import { KeyCountTable } from '../../../features/chat/metrics/KeyCountTable';
import { automaticRepliesByLabel, templateTitle } from '../../../features/chat/metrics/metricsFormat';
import type { KeyCountSummary } from '../../../services/api/types';
import { useCompanyTemplates } from '../../../services/queries/inbox';
import { formatNumber } from '../../../utils/format';

interface Props {
  automaticReplies: KeyCountSummary;
  quickReplies: KeyCountSummary;
}

/** Las respuestas automáticas del sistema (barras) y el uso de las respuestas guardadas del equipo (tabla), apiladas. */
export const RepliesSection = ({ automaticReplies, quickReplies }: Props) => {
  // El nombre de cada respuesta guardada sale de la lista de plantillas, que la API deja leer a quien ve las
  // métricas (`mensajes.supervisar`); si la lectura falla, se nombran genéricas.
  const templates = useCompanyTemplates({}, true);
  const titles = templates.data?.items ?? null;
  const automatic = automaticRepliesByLabel(automaticReplies.byKey);

  return (
    <div className="grid gap-4">
      <TableroWidget
        title="Respuestas automáticas"
        subtitle={`${formatNumber(automaticReplies.total)} enviadas solas por el sistema en el período.`}
        empty={automatic.length === 0 ? { title: 'Sin respuestas automáticas en el período' } : null}
      >
        <TableroBarList
          label="Respuestas automáticas por tipo"
          items={automatic.map(({ label, count }) => ({
            id: label,
            label,
            value: count,
            valueLabel: formatNumber(count),
            tone: 'info',
          }))}
        />
      </TableroWidget>
      <TableroWidget
        title="Respuestas guardadas"
        subtitle={`${formatNumber(quickReplies.total)} usos del equipo en el período.`}
        bodyClassName="px-0 pb-0 pt-1"
      >
        <KeyCountTable
          rows={quickReplies.byKey.map((row) => ({ ...row, title: templateTitle(row.key, titles) }))}
          label="uso de las respuestas guardadas"
          filename="respuestas-guardadas"
          noun={['respuesta', 'respuestas']}
          empty={{
            title: 'Sin respuestas guardadas usadas',
            description: 'En el período nadie del equipo respondió con una respuesta guardada.',
          }}
        />
      </TableroWidget>
    </div>
  );
};
