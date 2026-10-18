import type { GridColDef } from '@mui/x-data-grid';
import { Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  ResponsiveTable,
  RowActions,
} from '../../common/components/ui';
import { useBackToList } from '../../hooks';
import type { AgingAccountRow } from '../../services/api/types';
import { useCustomerAging } from '../../services/queries/finance';
import { formatCurrency } from '../../utils/format';

const money = (value: number) => formatCurrency(value);

/** Cuánto se debe y hace cuánto, por cuenta y en total (CU-239). */
export const CustomerAging = () => {
  const navigate = useNavigate();
  const goBack = useBackToList('/finance/accounts');
  useCrumbLeaf('Antigüedad de la deuda', goBack);
  const { data, isPending, error, refetch } = useCustomerAging();

  const columns: GridColDef<AgingAccountRow>[] = [
    { field: 'businessName', headerName: 'Cuenta', flex: 1.4, minWidth: 220, sortable: false },
    ...(
      [
        ['upTo30Days', '0 a 30 días'],
        ['from31To60Days', '31 a 60'],
        ['from61To90Days', '61 a 90'],
        ['over90Days', 'Más de 90'],
        ['total', 'Total'],
      ] as const
    ).map(([field, headerName]): GridColDef<AgingAccountRow> => ({
      field,
      headerName,
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => money(row[field]),
    })),
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`cuenta ${row.businessName}`}
          onView={() => navigate(`/finance/accounts/${row.accountId}`)}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Antigüedad de la deuda"
        description="La deuda abierta repartida por la antigüedad de cada comprobante."
      />
      {isPending ? (
        <LoadingState label="Calculando la deuda…" />
      ) : error || !data ? (
        <ErrorState error={error} resource="El reporte" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard title="0 a 30 días" icon={Hourglass} value={money(data.totals.upTo30Days)} />
            <KpiCard title="31 a 60 días" icon={Hourglass} value={money(data.totals.from31To60Days)} />
            <KpiCard title="61 a 90 días" icon={Hourglass} value={money(data.totals.from61To90Days)} />
            <KpiCard
              title="Más de 90 días"
              icon={Hourglass}
              value={money(data.totals.over90Days)}
              pill={data.totals.over90Days > 0 ? { text: 'Para reclamar', trend: 'down' } : undefined}
            />
            <KpiCard title="Deuda total" icon={Hourglass} value={money(data.totals.total)} />
          </div>
          <Card>
            <ResponsiveTable
              label="deuda por cuenta"
              rows={data.accounts}
              columns={columns}
              getRowId={(row) => row.accountId}
              onRowClick={(row) => navigate(`/finance/accounts/${row.accountId}`)}
              empty={<EmptyState illustration="done" title="Nadie debe nada" description="No hay deuda abierta." />}
              renderCard={(row) => (
                <>
                  <strong>{row.businessName}</strong>
                  <div className="font-mono text-sm">
                    Total {money(row.total)} · más de 90 días {money(row.over90Days)}
                  </div>
                </>
              )}
            />
          </Card>
        </div>
      )}
    </div>
  );
};
