import { useMemo, useState } from 'react';
import { MessageSquarePlus, SearchCheck } from 'lucide-react';
import {
  Card,
  DataTable,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  RowActions,
  TableToolbar,
  type TableColumn,
} from '../../../common/components/ui';
import type { UnansweredList, UnansweredQuestion } from '../../../services/api/types';
import type { FaqFromUnansweredInput, FaqFromUnansweredResult } from '../../../services/queries/assistantLab';
import { useUrlParams } from '../../../hooks';
import { toIsoDay } from '../../../utils/dates';
import { formatDateTime, formatDay, formatNumber } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { FaqFromUnansweredModal } from './FaqFromUnansweredModal';

interface Callbacks<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: unknown) => void;
}

interface Props {
  /** El listado del período que está en la URL (`from`, `to`). */
  useList: (period: { from?: string; to?: string }) => {
    data: UnansweredList | undefined;
    error: unknown;
    isPending: boolean;
    isFetching: boolean;
    refetch: () => unknown;
  };
  create: {
    mutate: (input: FaqFromUnansweredInput, callbacks: Callbacks<FaqFromUnansweredResult>) => void;
    isPending: boolean;
  };
  dismiss: { mutate: (id: string, callbacks: Callbacks<void>) => void };
  /** Sin permiso para escribir no se dibujan las acciones. */
  canManage: boolean;
  /** A quién le contesta el asistente («tus clientes», «las distribuidoras»). */
  audience: string;
}

/** Las preguntas que el asistente no supo contestar, agrupadas, para sumarlas a la base o descartarlas. */
export const UnansweredPanel = ({ useList, create, dismiss, canManage, audience }: Props) => {
  const [params, setParams] = useUrlParams({ from: '', to: '' });
  const period = useMemo(
    () => ({ ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}) }),
    [params.from, params.to],
  );
  const { data, error, isPending, isFetching, refetch } = useList(period);
  const [creating, setCreating] = useState<UnansweredQuestion | null>(null);

  const askDismiss = async (item: UnansweredQuestion) => {
    const ok = await confirm({
      title: '¿Descartar la pregunta?',
      text: `«${item.question}» deja de aparecer acá. Si se vuelve a preguntar, aparece de nuevo.`,
      confirmText: 'Descartar',
      danger: true,
    });
    if (ok) dismiss.mutate(item.id, { onSuccess: () => notify.success('Pregunta descartada'), onError: notify.error });
  };

  const columns = useMemo<TableColumn<UnansweredQuestion>[]>(
    () => [
      {
        field: 'question',
        headerName: 'Pregunta',
        kind: 'main',
        sortable: false,
        renderCell: ({ row }) => <span className="break-words text-sm text-ink">{row.question}</span>,
        tooltip: (row) => row.question,
      },
      {
        field: 'count',
        headerName: 'Veces',
        type: 'number',
        renderCell: ({ row }) => <span className="tabular-nums">{formatNumber(row.count)}</span>,
      },
      {
        field: 'lastSeenAt',
        headerName: 'Última vez',
        kind: 'date',
        renderCell: ({ row }) => formatDateTime(row.lastSeenAt),
      },
      {
        field: 'firstSeenAt',
        headerName: 'Primera vez',
        kind: 'date',
        card: false,
        renderCell: ({ row }) => formatDateTime(row.firstSeenAt),
      },
      ...(canManage
        ? [
            {
              field: 'actions',
              headerName: '',
              sortable: false,
              renderCell: ({ row }: { row: UnansweredQuestion }) => (
                <RowActions
                  rowLabel={`la pregunta «${row.question}»`}
                  actions={[
                    { label: 'Crear pregunta frecuente', icon: MessageSquarePlus, onClick: () => setCreating(row) },
                  ]}
                  onDelete={() => void askDismiss(row)}
                  deleteLabel="Descartar"
                />
              ),
            },
          ]
        : []),
    ],
    // `askDismiss` sólo usa `dismiss`, estable entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">
        {`Lo que ${audience} preguntaron y el asistente no supo contestar (o no estaba seguro), agrupado por pregunta. Sumá la respuesta a la base o descartala.`}
      </p>
      <Card>
        <TableToolbar
          filters={
            <DateRangeFilter
              label="Período"
              from={params.from}
              to={params.to}
              maxDay={toIsoDay(new Date())}
              onChange={(range) => setParams(range)}
            />
          }
          resultCount={data?.items.length}
          noun={['pregunta', 'preguntas']}
        />
        {data && (
          <p className="border-b border-outline px-4 pb-3 text-xs text-muted">
            {`Del ${formatDay(data.from)} al ${formatDay(data.to)}${params.from || params.to ? '' : ' (los últimos 30 días)'}.`}
            {data.truncated && ' Se agruparon sólo los mensajes más nuevos: acortá el período para ver el resto.'}
          </p>
        )}
        {!data && !isPending ? (
          <ErrorState error={error} resource="La lista de preguntas sin respuesta" onRetry={() => void refetch()} />
        ) : (
          <DataTable
            rows={data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isPending || isFetching}
            label="preguntas sin respuesta"
            empty={
              <EmptyState
                icon={SearchCheck}
                illustration="done"
                title="No hay preguntas sin respuesta"
                description="En este período el asistente supo contestar todo lo que le preguntaron."
              />
            }
          />
        )}
      </Card>
      <FaqFromUnansweredModal item={creating} onClose={() => setCreating(null)} create={create} />
    </div>
  );
};
