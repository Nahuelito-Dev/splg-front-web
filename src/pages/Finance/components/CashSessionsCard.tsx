import type { GridColDef } from '@mui/x-data-grid';
import { FileText, History } from 'lucide-react';
import { PdfButton } from '../../../common/components';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ResponsiveTable,
  CardHeader,
  RowActions,
  PersonAvatar,
} from '../../../common/components/ui';
import { usePdfDownload } from '../../../hooks';
import { useClampPage, useUrlPagedParams } from '../../../hooks';
import type { CashSession } from '../../../services/api/types';
import { useCashSessions } from '../../../services/queries/finance';
import { useUserNames } from '../../../services/queries/userNames';
import { formatCurrencyExact, formatDateTime, formatShortId } from '../../../utils/format';
import { CASH_SESSION_STATUS, labelOf } from '../../../utils/statusLabels';
import { canDownloadCashSessionPdf } from '../cashSessionPdf';
import { sessionDifference } from '../cashSessionDifference';

interface Props {
  cashBoxId: string;
}

const Who = ({ name, id }: { name: string | null; id: string | null }) => (
  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
    {id && <PersonAvatar name={name ?? formatShortId(id)} userId={id} size="xs" decorative />}
    <span className="truncate">{id ? `por ${name ?? formatShortId(id)}` : ''}</span>
  </span>
);

/** Historial de sesiones de una caja: apertura, cierre, arqueo y diferencia, con quién abrió y quién cerró (CU-226, 227). */
export const CashSessionsCard = ({ cashBoxId }: Props) => {
  const [, , pagination, setPagination] = useUrlPagedParams({}, 10);
  const { data, isFetching, error, refetch } = useCashSessions(cashBoxId, pagination);
  const rows = data?.data ?? [];
  const names = useUserNames(rows.flatMap((row) => [row.openedByUserId, row.closedByUserId]));
  useClampPage(pagination, data?.total, setPagination);
  const pdf = usePdfDownload();

  const columns: GridColDef<CashSession>[] = [
    {
      field: 'openedAt',
      headerName: 'Apertura',
      flex: 1,
      minWidth: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="flex min-w-0 flex-col py-1">
          <span>{formatDateTime(row.openedAt)}</span>
          <Who name={names.nameOf(row.openedByUserId)} id={row.openedByUserId} />
        </span>
      ),
    },
    {
      field: 'closedAt',
      headerName: 'Cierre',
      flex: 1,
      minWidth: 150,
      sortable: false,
      renderCell: ({ row }) =>
        row.closedAt ? (
          <span className="flex min-w-0 flex-col py-1">
            <span>{formatDateTime(row.closedAt)}</span>
            <Who name={names.nameOf(row.closedByUserId)} id={row.closedByUserId} />
          </span>
        ) : (
          <Badge label={labelOf(CASH_SESSION_STATUS, row.status)} />
        ),
    },
    {
      field: 'openingAmount',
      headerName: 'Inicial',
      width: 100,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrencyExact(row.openingAmount),
    },
    {
      field: 'countedAmount',
      headerName: 'Arqueo',
      width: 140,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) =>
        row.countedAmount === null ? (
          '—'
        ) : (
          <span className="flex flex-col items-end py-1">
            <span className="font-mono">{formatCurrencyExact(row.countedAmount)}</span>
            <span className="text-xs text-muted">esperado {formatCurrencyExact(row.expectedAmount)}</span>
          </span>
        ),
    },
    {
      field: 'difference',
      headerName: 'Diferencia',
      width: 120,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => {
        const verdict = sessionDifference(row.difference);
        return row.difference === null ? (
          '—'
        ) : (
          <span className="flex flex-col items-end gap-0.5 py-1">
            <span className="font-mono">{formatCurrencyExact(row.difference)}</span>
            <Badge label={verdict} />
          </span>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 72,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) =>
        canDownloadCashSessionPdf(row) ? (
          <RowActions
            rowLabel={`la sesión del ${formatDateTime(row.openedAt)}`}
            actions={[
              {
                label: 'Cierre (PDF)',
                icon: FileText,
                onClick: () => pdf.download({ kind: 'cash-session', sessionId: row.sessionId }),
              },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader title="Historial de sesiones" className="border-b border-outline px-5 py-3" />
      {error ? (
        <div className="p-4">
          <ErrorState error={error} resource="Las sesiones" onRetry={() => void refetch()} />
        </div>
      ) : (
        <ResponsiveTable
          label="sesiones de la caja"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.sessionId}
          loading={isFetching}
          pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
          empty={
            <EmptyState
              icon={History}
              title="Sin sesiones"
              description="Esta caja todavía no se abrió: la primera apertura queda registrada acá."
            />
          }
          renderCard={(row) => {
            const verdict = sessionDifference(row.difference);
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <strong>{formatDateTime(row.openedAt)}</strong>
                  <Badge label={labelOf(CASH_SESSION_STATUS, row.status)} />
                </div>
                <p className="text-xs text-muted">
                  Abrió {names.nameOf(row.openedByUserId) ?? formatShortId(row.openedByUserId)} con{' '}
                  {formatCurrencyExact(row.openingAmount)}
                </p>
                {row.closedAt && (
                  <>
                    <p className="text-xs text-muted">
                      Cerró {formatDateTime(row.closedAt)}
                      {row.closedByUserId &&
                        ` · ${names.nameOf(row.closedByUserId) ?? formatShortId(row.closedByUserId)}`}
                    </p>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span>
                        Contado <b className="font-mono">{formatCurrencyExact(row.countedAmount)}</b> de{' '}
                        {formatCurrencyExact(row.expectedAmount)}
                      </span>
                      <span className="font-mono">{formatCurrencyExact(row.difference)}</span>
                      <Badge label={verdict} />
                    </p>
                  </>
                )}
                {canDownloadCashSessionPdf(row) && (
                  <div>
                    <PdfButton
                      request={{ kind: 'cash-session', sessionId: row.sessionId }}
                      label="Cierre (PDF)"
                      size="sm"
                    />
                  </div>
                )}
              </>
            );
          }}
        />
      )}
    </Card>
  );
};
