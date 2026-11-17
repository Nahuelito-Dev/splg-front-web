import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { EmptyState, IdentityCell, ResponsiveTable, TableToolbar } from '../../../../common/components/ui';
import { csvPercent, formatRate } from '../../../../features/chat/metrics/metricsFormat';
import type { CompanyChatUsage } from '../../../../services/api/types';
import { formatNumber } from '../../../../utils/format';

/** Lo que hizo el asistente de la empresa en el período, o un guion si no lo usó. */
const assistantText = (row: CompanyChatUsage) =>
  row.assistant
    ? `${formatNumber(row.assistant.aiReplies)} respuestas · ${formatRate(row.assistant.resolvedWithoutHumanRate)} sin persona`
    : '—';

const columns: GridColDef<CompanyChatUsage>[] = [
  {
    field: 'name',
    headerName: 'Empresa',
    flex: 1.3,
    minWidth: 200,
    sortable: false,
    renderCell: ({ row }) => <IdentityCell title={row.name} avatarName={row.name} />,
  },
  {
    field: 'conversations',
    headerName: 'Conversaciones',
    width: 150,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="tabular-nums">{formatNumber(row.conversations)}</span>,
  },
  {
    field: 'messages',
    headerName: 'Mensajes',
    width: 120,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className="tabular-nums">{formatNumber(row.messages)}</span>,
  },
  {
    field: 'assistant',
    headerName: 'Asistente',
    flex: 1,
    minWidth: 220,
    sortable: false,
    renderCell: ({ row }) => <span className="text-ink-2">{assistantText(row)}</span>,
  },
];

const UsageCard = (row: CompanyChatUsage) => (
  <div className="grid gap-1">
    <p className="truncate text-sm font-medium text-ink">{row.name}</p>
    <p className="text-sm text-ink-2">
      {formatNumber(row.conversations)} conversaciones · {formatNumber(row.messages)} mensajes
    </p>
    <p className="text-xs text-muted">Asistente: {assistantText(row)}</p>
  </div>
);

/** Uso del chat por empresa en el período: sólo conteos, nunca el texto de los mensajes. */
export const CompanyUsageTable = ({ companies }: { companies: CompanyChatUsage[] }) => {
  const [search, setSearch] = useState('');
  const term = search.trim().toLocaleLowerCase('es-AR');
  const rows = term ? companies.filter((row) => row.name.toLocaleLowerCase('es-AR').includes(term)) : companies;
  return (
    <>
      <TableToolbar
        search={{ label: 'Buscar empresas', placeholder: 'Nombre de la empresa', value: search, onChange: setSearch }}
        resultCount={rows.length}
        noun={['empresa', 'empresas']}
        csv={{
          filename: 'uso-del-chat-por-empresa',
          headers: ['Empresa', 'Conversaciones', 'Mensajes', 'Respuestas del asistente', 'Resueltas sin persona (%)'],
          rows: rows.map((row) => [
            row.name,
            row.conversations,
            row.messages,
            row.assistant?.aiReplies ?? '',
            csvPercent(row.assistant?.resolvedWithoutHumanRate),
          ]),
        }}
      />
      <ResponsiveTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.distributorId}
        renderCard={UsageCard}
        label="uso del chat por empresa"
        empty={
          term ? (
            <EmptyState
              title="Sin resultados"
              description="Ninguna empresa coincide con la búsqueda."
              illustration="search"
            />
          ) : (
            <EmptyState title="Sin uso del chat en el período" description="Ninguna empresa tuvo conversaciones." />
          )
        }
      />
    </>
  );
};
