import type { GridColDef } from '@mui/x-data-grid';
import { Link } from 'react-router-dom';
import { ResponsiveTable, TableroWidget, TableToolbar } from '../../../common/components/ui';
import { LabelChip } from '../../../features/chat/labels/LabelChip';
import { csvPercent, formatMetricMinutes, formatRate } from '../../../features/chat/metrics/metricsFormat';
import { MESSAGES_SETTINGS_PATH } from '../../../features/chat/routes';
import type { ChatLabelMetrics } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';

type Row = ChatLabelMetrics & { id: string };

const columns: GridColDef<Row>[] = [
  {
    field: 'label',
    headerName: 'Etiqueta',
    flex: 1,
    minWidth: 160,
    sortable: false,
    renderCell: ({ row }) => <LabelChip name={row.label.name} color={row.label.color} />,
  },
  {
    field: 'conversations',
    headerName: 'Conversaciones',
    width: 140,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="tabular-nums">{formatNumber(row.conversations)}</span>,
  },
  {
    field: 'firstResponse',
    headerName: 'Primera respuesta',
    width: 160,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <span className="tabular-nums">{formatMetricMinutes(row.firstResponse.medianMinutes)}</span>
    ),
  },
  {
    field: 'target',
    headerName: 'Dentro del objetivo',
    width: 160,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="tabular-nums">{formatRate(row.firstResponse.target?.rate ?? null)}</span>,
  },
];

/** Una métrica de la tarjeta angosta: su propio renglón, nombre a la izquierda y valor a la derecha (sin pisarse). */
const CardMetric = ({ name, value }: { name: string; value: string }) => (
  <div className="flex min-w-0 items-baseline justify-between gap-3">
    <dt className="min-w-0 break-words text-muted">{name}</dt>
    <dd className="shrink-0 font-semibold tabular-nums text-ink">{value}</dd>
  </div>
);

const LabelCard = (row: Row) => (
  <div className="grid min-w-0 gap-1.5">
    <LabelChip name={row.label.name} color={row.label.color} className="justify-self-start" />
    <dl className="grid min-w-0 gap-1 text-xs" aria-label={`Métricas de «${row.label.name}»`}>
      <CardMetric name="Conversaciones" value={formatNumber(row.conversations)} />
      <CardMetric name="Primera respuesta" value={formatMetricMinutes(row.firstResponse.medianMinutes)} />
      <CardMetric name="Dentro del objetivo" value={formatRate(row.firstResponse.target?.rate ?? null)} />
    </dl>
  </div>
);

interface Props {
  byLabel: ChatLabelMetrics[];
  canConfigure: boolean;
}

/**
 * «Por etiqueta» (`byLabel`): cada etiqueta vigente con sus conversaciones del período (las que la tienen puesta hoy)
 * y su primera respuesta (mediana en minutos hábiles). Todo lo calcula la API.
 */
export const LabelsSection = ({ byLabel, canConfigure }: Props) => {
  const rows: Row[] = [...byLabel]
    .sort((a, b) => b.conversations - a.conversations)
    .map((item) => ({ ...item, id: item.label.id }));
  return (
    <TableroWidget
      title="Por etiqueta"
      subtitle="Conversaciones del período con cada etiqueta (la que tienen puesta hoy) y su primera respuesta."
      bodyClassName="px-0 pb-0 pt-1"
      empty={
        rows.length === 0
          ? {
              title: 'Sin etiquetas',
              description: canConfigure
                ? 'Creá etiquetas en la configuración de los mensajes para ver este corte.'
                : 'Cuando la empresa tenga etiquetas, acá se ve cada una.',
            }
          : null
      }
    >
      <TableToolbar
        resultCount={rows.length}
        noun={['etiqueta', 'etiquetas']}
        csv={{
          filename: 'mensajes-por-etiqueta',
          headers: ['Etiqueta', 'Conversaciones', 'Primera respuesta (min hábiles)', 'Dentro del objetivo (%)'],
          rows: rows.map((row) => [
            row.label.name,
            row.conversations,
            row.firstResponse.medianMinutes ?? '',
            csvPercent(row.firstResponse.target?.rate),
          ]),
        }}
      />
      <ResponsiveTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        renderCard={LabelCard}
        label="Por etiqueta"
      />
      {canConfigure && (
        <p className="px-4 py-3 text-xs text-muted">
          <Link to={MESSAGES_SETTINGS_PATH} className="font-medium text-primary underline">
            Administrar las etiquetas
          </Link>
        </p>
      )}
    </TableroWidget>
  );
};
