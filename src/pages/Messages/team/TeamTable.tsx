import { UsersRound } from 'lucide-react';
import { useMemo } from 'react';
import {
  Badge,
  EmptyState,
  IdentityCell,
  ResponsiveTable,
  RowActions,
  type TableColumn,
} from '../../../common/components/ui';
import { agentPresence } from '../../../features/chat/assignment/presence';
import type { ChatAgent } from '../../../services/api/types';
import { formatDateTime, formatElapsed } from '../../../utils/format';
import { CHAT_AGENT_PRESENCE } from '../../../utils/statusLabels';
import { channelsText, limitSource, loadText } from './agentText';

interface Props {
  agents: ChatAgent[];
  /** Si la empresa atiende ahora (`openNow` de la configuración), para decir «Fuera de horario». */
  openNow: boolean | undefined;
  now: number;
  loading: boolean;
  /** Editar el tope de una persona; sin él (sólo supervisa o modo soporte) no se dibuja el botón. */
  onEdit?: (agent: ChatAgent) => void;
}

const lastAssigned = (agent: ChatAgent, now: number) =>
  agent.lastAssignedAt ? formatElapsed(agent.lastAssignedAt, now) : 'Todavía no';

/** La tarjeta del celular (y de los tests): los mismos datos que las columnas. */
const AgentCard = ({ agent, openNow, now, onEdit }: { agent: ChatAgent } & Omit<Props, 'agents' | 'loading'>) => (
  <div className="flex items-start gap-3 border-b border-outline-soft px-4 py-3">
    <div className="grid min-w-0 flex-1 gap-1.5">
      <IdentityCell
        title={agent.name}
        subtitle={channelsText(agent.channels)}
        avatarName={agent.name}
        person={{ userId: agent.userId }}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
        <Badge label={CHAT_AGENT_PRESENCE[agentPresence(agent, openNow)]} />
        <span>
          Abiertas: <span className="font-medium text-ink">{loadText(agent)}</span> ({limitSource(agent).toLowerCase()})
        </span>
        <span>Última asignación: {lastAssigned(agent, now)}</span>
      </div>
    </div>
    {onEdit && <RowActions rowLabel={`el tope de ${agent.name}`} onEdit={() => onEdit(agent)} />}
  </div>
);

/** El equipo de la bandeja: persona y canales, estado, abiertas sobre su tope, última asignación y editar el tope. */
export const TeamTable = ({ agents, openNow, now, loading, onEdit }: Props) => {
  const columns = useMemo<TableColumn<ChatAgent>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Persona',
        kind: 'main',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.name}
            subtitle={channelsText(row.channels)}
            avatarName={row.name}
            person={{ userId: row.userId }}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        kind: 'status',
        sortable: false,
        renderCell: ({ row }) => <Badge label={CHAT_AGENT_PRESENCE[agentPresence(row, openNow)]} />,
      },
      {
        field: 'openAssigned',
        headerName: 'Abiertas / tope',
        sortable: false,
        minWidth: 150,
        renderCell: ({ row }) => (
          <span className="grid leading-tight">
            <span className="font-medium text-ink">{loadText(row)}</span>
            <span className="text-[11.5px] text-muted">{limitSource(row)}</span>
          </span>
        ),
      },
      {
        field: 'lastAssignedAt',
        headerName: 'Última asignación',
        kind: 'date',
        sortable: false,
        renderCell: ({ row }) => (
          <span title={row.lastAssignedAt ? formatDateTime(row.lastAssignedAt) : undefined}>
            {lastAssigned(row, now)}
          </span>
        ),
      },
      ...(onEdit
        ? [
            {
              field: 'actions',
              headerName: '',
              sortable: false,
              renderCell: ({ row }: { row: ChatAgent }) => (
                <RowActions rowLabel={`el tope de ${row.name}`} onEdit={() => onEdit(row)} />
              ),
            } satisfies TableColumn<ChatAgent>,
          ]
        : []),
    ],
    [openNow, now, onEdit],
  );

  return (
    <ResponsiveTable
      rows={agents}
      columns={columns}
      getRowId={(agent) => agent.userId}
      label="el equipo"
      loading={loading}
      renderCard={(agent) => <AgentCard agent={agent} openNow={openNow} now={now} onEdit={onEdit} />}
      empty={
        <EmptyState
          icon={UsersRound}
          title="Nadie atiende los mensajes todavía"
          description="Dale a alguien del personal el permiso «Atender los mensajes de los clientes» o «de los choferes» y va a aparecer acá."
        />
      }
    />
  );
};
